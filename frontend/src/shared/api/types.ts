// Types écrits à la main depuis docs/API_CONTRACT.md (contrat v1 figé).
export type Role =
  | 'producteur' | 'agent_atda' | 'agronome_inrab' | 'responsable_programme'
  | 'admin_maep' | 'auditeur_copil' | 'agent_financier';
export type Lang = 'fr' | 'fon' | 'bba' | 'yo' | 'dnd';

export interface User {
  id: string; phone: string; full_name: string; role: Role;
  department: string | null; commune: string | null; producer_id: string | null; language: Lang;
}
export interface Paginated<T> { next: string | null; previous: string | null; results: T[] }
export interface ApiErrorBody {
  detail?: string; code?: string; fields?: Record<string, string[]>; existing?: { id: string; code: string };
}

export interface ValueChain { code: string; name: string }
export interface Department { code: string; name: string; communes: { code: string; name: string }[] }

export type ProducerStatus = 'en_attente' | 'valide' | 'rejete';
export interface Producer {
  id: string; code: string; npi: string; first_name: string; last_name: string; sex: 'F' | 'M';
  birth_date: string; department: string; commune: string; phone: string; language: Lang;
  status: ProducerStatus; reject_reason: string | null; created_at: string; validated_at: string | null;
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
  object_type: string; object_id: string; details: unknown;
}

export type LandType = 'pluvial_plateau' | 'bas_fond' | 'irrigue';
export type Tenure = 'propriete' | 'location' | 'pret' | 'coutumier' | 'autre';
export interface GeoPolygon { type: 'Polygon'; coordinates: number[][][] }
export interface Parcel {
  id: string; producer?: string; name: string; geometry: GeoPolygon; land_type: LandType; tenure: Tenure;
  area_ha: number; overlap_warning: boolean; overlap_with: string[];
}
export interface ParcelCreate { producer?: string; name: string; geometry: GeoPolygon; land_type: LandType; tenure: Tenure }
export type Stage = 'semis' | 'croissance' | 'floraison' | 'recolte';
export interface Campaign { id: string; parcel: string; value_chain: string; season: string; stage: Stage }
export interface CampaignCreate { parcel: string; value_chain: string; season: string; stage: Stage }

export interface Citation { doc_id: string; title: string; source: string; version: number | string }
export interface AssistantAnswer {
  status: 'answered' | 'unknown' | 'escalated'; answer: string; citations: Citation[];
  disclaimer: string; backend: string;
}

export type KnowledgeStatus = 'brouillon' | 'relu' | 'publie';
export interface KnowledgeDoc {
  id: string; value_chain: string; title: string; body: string; source: string; version: number;
  status: KnowledgeStatus; language: Lang; language_validation: 'valide' | 'non_valide'; updated_at: string;
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

export interface Program {
  id: string; name: string; description: string; conditions: string; value_chains: string[];
  closes_at: string; is_open?: boolean; is_closed?: boolean;
}
export type ApplicationStatus = 'deposee' | 'en_instruction' | 'acceptee' | 'refusee';
export interface Application {
  id: string; program: string; program_name?: string; producer: string; producer_name?: string; producer_code?: string;
  status: ApplicationStatus; reason?: string | null; created_at: string;
}
export interface Weights { confidence: number; road_distance: number; area: number }
export interface SelectionRun {
  id: string; weights: Weights; target_count: number; status: 'proposition' | 'validee';
  selected_count: number; created_by: string; validated_by: string | null; validation_reason: string | null;
  created_at: string; program?: string | null; department?: string | null;
}
export interface Candidate {
  farm_id: string; department: string; commune: string; score: number; rank: number; selected: boolean;
  confidence: number; road_distance_m: number; area_ha: number;
}
export interface Contest { id: string; farm_id: string; reason: string; status: string; created_at?: string }

export interface FarmAggregate { name: string; farms: number | null; maize_ha: number | null; source: string; updated_at: string }
export interface Indicator { key: string; label: string; value: number | null; unit: string; source: string; updated_at: string }
export interface Dashboard { scope: string | { department: string | null; name: string }; indicators: Indicator[] }
