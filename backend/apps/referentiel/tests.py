from conftest import client_for


def test_departments_expose_their_position_for_the_place_search_fallback():
    deps = client_for().get("/api/v1/ref/departments").json()
    assert len(deps) == 12
    for d in deps:
        # le navigateur centre la carte dessus quand la recherche en ligne de lieux n'est pas joignable
        assert 6.0 < d["lat"] < 12.6 and 0.5 < d["lon"] < 4.0, d["code"]
    alibori = next(d for d in deps if d["code"] == "alibori")
    assert alibori["lat"] > 10.5 and {"code", "name", "communes"} <= set(alibori)
