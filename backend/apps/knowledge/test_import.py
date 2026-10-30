import io
import zipfile

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.core.errors import ApiError
from apps.knowledge import importer, services
from conftest import client_for

URL = "/api/v1/knowledge"


def _txt(text, name="guide-mais.txt"):
    return SimpleUploadedFile(name, text.encode(), "text/plain")


def _docx(paragraphs, extra=""):
    body = "".join(f"<w:p><w:r><w:t>{p}</w:t></w:r></w:p>" for p in paragraphs)
    xml = (f'{extra}<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
           f"<w:body>{body}</w:body></w:document>")
    out = io.BytesIO()
    with zipfile.ZipFile(out, "w") as z:
        z.writestr("word/document.xml", xml)
    return out.getvalue()


def _pdf(text):
    """PDF d'une page, écrit à la main (texte ASCII) : de quoi tester l'extraction sans dépendance de plus."""
    stream = f"BT /F1 12 Tf 50 750 Td ({text}) Tj ET".encode()
    objs = [b"<< /Type /Catalog /Pages 2 0 R >>", b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
            b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R "
            b"/Resources << /Font << /F1 5 0 R >> >> >>",
            b"<< /Length %d >>\nstream\n" % len(stream) + stream + b"\nendstream",
            b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"]
    out, offs = b"%PDF-1.4\n", []
    for i, o in enumerate(objs, 1):
        offs.append(len(out))
        out += b"%d 0 obj\n" % i + o + b"\nendobj\n"
    x = len(out)
    out += b"xref\n0 %d\n0000000000 65535 f \n" % (len(objs) + 1) + b"".join(b"%010d 00000 n \n" % o for o in offs)
    return out + b"trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF" % (len(objs) + 1, x)


TEXT = "\n\n".join(f"Partie {i}. " + "Le maïs se sème en juin après les premières pluies utiles. " * 8 for i in range(6))


def test_a_document_is_cut_into_extracts_that_wait_for_a_second_person(users):
    agro, admin = client_for(users["agronome"]), client_for(users["admin"])
    r = agro.post(f"{URL}/import", {"file": _txt(TEXT), "value_chain": "mais", "source": "Guide INRAB 2025"},
                  format="multipart")
    assert r.status_code == 201
    n, batch = r.json()["chunks"], r.json()["batch"]
    assert n >= 3 and r.json()["title"] == "guide-mais"
    drafts = [d for d in admin.get(f"{URL}?status=brouillon").json()["results"] if d["title"].startswith("guide-mais (partie")]
    assert len(drafts) == n and all(d["source"] == "Guide INRAB 2025" for d in drafts)
    services.rebuild_index()
    assert services.search("Quand semer le maïs en juin ?", "mais") == []  # un brouillon n'atteint pas l'assistant
    assert agro.post(f"{URL}/batches/{batch}/review").json()["code"] == "same_author"  # pas l'auteur lui-même
    assert admin.post(f"{URL}/batches/{batch}/publish").json() == {"published": 0}  # rien n'est publiable avant la relecture
    assert admin.post(f"{URL}/batches/{batch}/review").json() == {"reviewed": n}
    assert admin.post(f"{URL}/batches/{batch}/publish").json() == {"published": n}
    services.rebuild_index()
    hits = services.search("Quand semer le maïs en juin ?", "mais")
    assert hits and hits[0][1]["source"] == "Guide INRAB 2025"
    assert admin.delete(f"{URL}/batches/{batch}").status_code == 400  # une fiche publiée se corrige, elle ne se supprime pas
    summary = admin.get(f"{URL}/batches").json()
    assert summary[0]["chunks"] == n and summary[0]["status"] == {"brouillon": 0, "relu": 0, "publie": n}


def test_an_unpublished_import_can_be_removed(users):
    agro = client_for(users["agronome"])
    batch = agro.post(f"{URL}/import", {"file": _txt(TEXT), "value_chain": "mais"}, format="multipart").json()["batch"]
    assert agro.delete(f"{URL}/batches/{batch}").status_code == 204
    assert agro.get(f"{URL}/batches").json() == []
    assert agro.delete(f"{URL}/batches/{batch}").status_code == 404


def test_only_editors_import_and_files_are_checked(users):
    assert client_for(users["agent"]).post(f"{URL}/import", {"file": _txt(TEXT)}, format="multipart").status_code == 403
    assert client_for(users["agent"]).get(f"{URL}/batches").status_code == 403
    admin = client_for(users["admin"])

    def up(name, data, **extra):
        return admin.post(f"{URL}/import", {"file": SimpleUploadedFile(name, data), "value_chain": "mais", **extra},
                          format="multipart")

    assert up("virus.exe", b"MZ").json()["code"] == "unsupported_format"
    assert up("vide.txt", b"   \n  ").json()["code"] == "no_text"
    assert up("gros.txt", b"a" * (importer.MAX_BYTES + 1)).json()["code"] == "file_too_large"
    assert up("faux.pdf", b"pas un pdf").json()["code"] == "invalid_document"
    assert up("faux.docx", b"pas un zip").json()["code"] == "invalid_document"
    bomb = _docx(["Texte"], extra='<!DOCTYPE x [<!ENTITY a "aaaa">]>')
    assert up("piege.docx", bomb).json()["code"] == "invalid_document"  # pas d'entités XML
    assert admin.post(f"{URL}/import", {"value_chain": "mais"}, format="multipart").status_code == 400  # fichier absent


def test_pdf_word_and_text_are_read():
    sentence = "Le maïs se sème en juin."
    assert "Semer en juin" in importer.extract_text("a.TXT", "Semer en juin".encode())
    assert "Le mais se seme" in importer.extract_text("a.pdf", _pdf("Le mais se seme en juin"))
    assert importer.extract_text("a.docx", _docx([sentence, "Puis sarcler."])) == f"{sentence}\nPuis sarcler."
    assert "é" in importer.extract_text("a.md", "é".encode("cp1252"))  # texte Windows non UTF-8
    with pytest.raises(ApiError):
        importer.extract_text("a.xlsx", b"")


def test_chunks_keep_every_word_and_stay_small():
    long_paragraph = " ".join(f"Phrase numéro {i} sur le semis du maïs." for i in range(120))
    chunks = importer.chunk_text("Titre court\n\n" + long_paragraph + "\n\nFin.")
    assert all(len(c) <= importer.CHUNK_CHARS * 1.5 for c in chunks) and len(chunks) >= 3
    joined = " ".join(chunks)
    assert "Phrase numéro 0 " in joined and "Phrase numéro 119 " in joined and "Titre court" in joined
    assert importer.chunk_text("trop court") == []  # moins de 60 caractères : pas un extrait
    assert importer.chunk_text("x" * 5000)  # sans ponctuation : coupe nette, sans boucle infinie
