// Types écrits à la main depuis docs/API_CONTRACT.md (contrat v1 figé).
export type Role =
  | 'producteur' | 'agent_atda' | 'agronome_inrab' | 'responsable_programme'
  | 'admin_maep' | 'auditeur_copil' | 'agent_financier'
  | 'gestionnaire_cooperative' | 'transformateur' | 'distributeur' | 'repr_mtdi';
export type Lang = 'fr' | 'fon' | 'bba' | 'yo' | 'dnd';

export interface User {
  id: string; phone: string; full_name: string; role: Role;
  department: string | null; commune: string | null; producer_id: string | null; language: Lang;
}
export interface Paginated<T> { next: string | null; previous: string | null; results: T[] }
export interface ApiErrorBody {
  detail?: string; code?: string; fields?: Record<string, string[]>; existing?: { id: string; code: string };
  /** 409 conflict (UC-25) : objet serveur courant et sa version. */
  server?: Record<string, unknown>; server_version?: number;
}

export interface ValueChain { code: string; name: string; reserve?: boolean }
export interface Department { code: string; name: string; communes: { code: string; name: string }[] }

export type ProducerStatus = 'en_attente' | 'valide' | 'rejete' | 'ferme' | 'efface';
export interface Producer {
  id: string; code: string; npi: string; first_name: string; last_name: string; sex: 'F' | 'M';
  birth_date: string; department: string; commune: string; phone: string; language: Lang;
  status: ProducerStatus; reject_reason: string | null; created_at: string; validated_at: string | null; version?: number;
}
export interface ProducerRegister {
  npi: string; first_name: string; last_name: string; sex: 'F' | 'M'; birth_date: string;
  department: string; commune: string; phone: string; language: Lang;
  consent_accepted: true; consent_text_version: 'v1';
  guardian_name?: string; guardian_npi?: string; guardian_consent?: boolean;
}
export type ProducerVersion = Record<string, unknown>;
export interface Consent {
  id: string; purpose?: string; text_version?: string; accepted_at?: string;
  withdrawn_at?: string | null; channel?: string; [k: string]: unknown;
}

export interface AdminUser extends User { is_active: boolean }

export interface AuditLog {
  id: string; at: string; actor_phone: string; actor_role: string; action: string;
  object_type: string; object_id: string; details: unknown; seq?: number | null; prev_hash?: string; hash?: string;
}
export interface AuditChainCheck { ok: boolean; count: number; broken_seq: number | null; checked_at: string }

export type LandType = 'pluvial_plateau' | 'bas_fond' | 'irrigue';
export type Tenure = 'propriete' | 'location' | 'pret' | 'coutumier' | 'autre';
export interface GeoPolygon { type: 'Polygon'; coordinates: number[][][] }
export interface Parcel {
  id: string; producer?: string; name: string; geometry: GeoPolygon; land_type: LandType; tenure: Tenure;
  area_ha: number; overlap_warning: boolean; overlap_with: string[];
}
export interface ParcelCreate { producer?: string; name: string; geometry: GeoPolygon; land_type: LandType; tenure: Tenure }
export type Stage = 'semis' | 'croissance' | 'floraison' | 'recolte';
export interface Campaign { id: string; parcel: string; value_chain: string; season: string; stage: Stage; version?: number; variety?: string; sown_at?: string | null; estimated_kg?: number | null }
export interface CampaignCreate { parcel: string; value_chain: string; season: string; stage: Stage; variety?: string; sown_at?: string | null }

export interface Citation { doc_id: string; title: string; source: string; version: number | string }
export interface AssistantAnswer {
  status: 'answered' | 'unknown' | 'escalated'; answer: string; citations: Citation[];
  disclaimer: string; backend: string;
}

export type KnowledgeStatus = 'brouillon' | 'relu' | 'publie';
export interface KnowledgeDoc {
  id: string; value_chain: string; title: string; body: string; source: string; version: number;
  status: KnowledgeStatus; language: Lang; language_validation: 'valide' | 'non_valide'; updated_at: string;
  reviewed_by_name?: string | null; reviewed_at?: string | null;
}

export type Severity = 'info' | 'avertissement' | 'urgent';
export type AlertCategory = 'meteo' | 'ravageur' | 'programme' | 'marche';
export interface Alert {
  id: string; title: string; message: string; category: AlertCategory;
  severity: Severity; department: string; communes: string[]; value_chains: string[];
  status: string; created_by?: string; created_at?: string;
  stats?: Partial<SendResult> | null; sent_at?: string | null;
}
export interface SendResult { sent: number; delivered: number; failed: number }
export interface Notification {
  id: string; title?: string; body?: string; message?: string; read_at?: string | null; is_read?: boolean; created_at: string;
}
export interface OutboxMessage {
  id: string; channel: 'sms' | 'voice'; to: string; body: string; segments: number;
  encoding: string; status: 'livre' | 'echoue' | 'lu'; created_at: string;
}

export type ProgramState = 'brouillon' | 'a_venir' | 'ouvert' | 'clos';
export interface Program {
  id: string; name: string; description: string; conditions: string; value_chains: string[];
  closes_at: string; is_open?: boolean; is_closed?: boolean;
  status?: 'brouillon' | 'publie'; state?: ProgramState; opens_at?: string | null; committee_at?: string | null;
  departments?: string[]; max_area_ha?: number | null; planned_beneficiaries?: number | null; require_campaign?: boolean;
}
export type ApplicationStatus = 'deposee' | 'en_instruction' | 'acceptee' | 'refusee';
export interface Application {
  id: string; program: string; program_name?: string; producer: string; producer_name?: string; producer_code?: string;
  status: ApplicationStatus; reason?: string | null; created_at: string;
  decided_at?: string | null; contest_reason?: string; contested_at?: string | null;
}
export interface Weights { confidence: number; road_distance: number; area: number }
export interface SelectionRun {
  id: string; weights: Weights; target_count: number; status: 'proposition' | 'validee';
  selected_count: number; created_by: string; validated_by: string | null; validation_reason: string | null;
  created_at: string; program?: string | null; department?: string | null; total_count?: number;
}
export interface Candidate {
  farm_id: string; department: string; commune: string; score: number; rank: number; selected: boolean;
  confidence: number; road_distance_m: number; area_ha: number;
}
export interface Contest { id: string; farm_id: string; reason: string; status: string; created_at?: string; run?: string; decision_reason?: string | null; decided_at?: string | null }

export interface FarmAggregate { name: string; farms: number | null; maize_ha: number | null; source: string; updated_at: string }
export interface Indicator { key: string; label: string; value: number | null; unit: string; source: string; updated_at: string }
export interface Dashboard { scope: string | { department: string | null; name: string }; indicators: Indicator[] }

// ---- Contrat v2 (docs/API_CONTRACT_V2.md) ----
export interface Cooperative { id: string; name: string; department: string; commune: string; value_chains: string[]; members_count: number; manager_phone?: string | null; registration_number?: string | null }
export type MemberRole = 'membre' | 'president' | 'tresorier' | 'secretaire';
export interface Membership { id: string; producer_id: string; producer_code: string; producer_name: string; role: MemberRole; joined_at: string; left_at: string | null; cooperative?: string; cooperative_name?: string; end_reason?: string | null }
export interface ProducerCard { code: string; full_name: string; commune: string; department: string; status: ProducerStatus; verification_code: string; verify_url: string; issued_at: string }
export interface VerifyResult { status: ProducerStatus; full_name: string }
// quantity : décimal que DRF sérialise en chaîne ("50.00") ; producer_code et program_name viennent du serveur (pas de nom de producteur).
export interface Support { id: string; producer: string; producer_code?: string; program?: string | null; program_name?: string | null; item: string; quantity: string; unit: string; value_xof: number; repayable: boolean; status: 'remis' | 'confirme'; created_at?: string; confirmed_at?: string | null }
export interface Harvest { id: string; campaign: string; harvested_at: string; quantity_kg: number; stored_kg: number; sold_kg: number; sale_price_xof_per_kg?: number | null; estimated_kg: number | null; deviation_pct: number | null; flagged: boolean; producer_code?: string; value_chain?: string;
  check_status?: 'a_verifier' | 'visite' | 'confirmee' | 'corrigee'; check_reason?: string; checked_at?: string | null; declared_kg?: number | null }
export interface Diagnosis { id: string; pathology: string; pathology_label: string; confidence: number; status: 'auto' | 'transmis_agronome' | 'revu'; advice: string; simulation: boolean; value_chain?: string; created_at?: string; review_comment?: string | null; reviewed_at?: string | null; producer_note?: string; image_url?: string; help?: string }
export type TrLang = 'fon' | 'bba' | 'yo' | 'dnd';
export type TrStatus = 'a_traduire' | 'propose' | 'valide' | 'rejete';
export interface TranslationEntry { id: string; key: string; language: TrLang; source_text: string; text: string; status: TrStatus; average_score: number | null; reviews_count: number; updated_at?: string }
export interface TranslationSummary { language: TrLang; total: number; valide: number; average_score: number | null; open_to_producers: boolean }
export type OfferType = 'offre' | 'demande';
export interface Offer { id: string; type: OfferType; value_chain: string; quantity_kg: number; price_xof_per_kg: number; department: string; commune: string; description: string; status: 'ouverte' | 'en_relation' | 'conclue' | 'retiree'; owner?: string; owner_name?: string; created_at?: string; owner_role?: string; owner_phone_masked?: string; is_mine?: boolean }
export interface Match { id: string; offer: string | Offer; requester: string; requester_name?: string; status: 'proposee' | 'acceptee' | 'refusee'; message?: string; other_phone?: string | null; is_owner?: boolean; created_at?: string; decided_at?: string | null; counterpart_phone?: string; offer_summary?: Pick<Offer, 'type' | 'value_chain' | 'quantity_kg' | 'price_xof_per_kg' | 'status'> }
export type PaymentStatus = 'en_attente' | 'reussi' | 'echoue' | 'rembourse';
export interface Receipt { reference: string; amount_xof: number; payer_masked: string; payee_masked: string; paid_at: string }
export interface Payment { id: string; status: PaymentStatus; provider: string; reference: string; amount_xof?: number; match?: string; receipt?: Receipt | null; payer_masked?: string; created_at?: string; paid_at?: string | null; refunded_at?: string | null; simulation?: boolean }
export interface SatelliteRow { department: string; commune: string | null; ndvi: number | null; soil_moisture_pct: number | null; acquired_at: string; sensor: string }
export interface SatelliteData { source: string; results: SatelliteRow[] }
export interface SeaIndicator extends Indicator { breakdown?: { label: string; value: number | null }[] }
export interface SeaDashboard { scope: Dashboard['scope']; indicators: SeaIndicator[] }
