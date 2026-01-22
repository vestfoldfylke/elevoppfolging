export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  Date: { input: string; output: string; }
  Long: { input: number; output: number; }
};

export type Adresse = {
  __typename?: 'Adresse';
  /** Attributes */
  adresselinje: Array<Maybe<Scalars['String']['output']>>;
  /** Relations */
  land?: Maybe<Landkode>;
  postnummer?: Maybe<Scalars['String']['output']>;
  poststed?: Maybe<Scalars['String']['output']>;
};

export type Aktivitet = {
  __typename?: 'Aktivitet';
  /**
   * Begrep
   * Relations
   */
  fullmakt?: Maybe<Array<Maybe<Fullmakt>>>;
  /** Inherited Attributes */
  gyldighetsperiode?: Maybe<Periode>;
  /** Begrep */
  kode: Scalars['String']['output'];
  /** Begrep */
  navn: Scalars['String']['output'];
  /** Begrep */
  passiv?: Maybe<Scalars['Boolean']['output']>;
  /** Begrep */
  systemId: Identifikator;
};

export type Anlegg = {
  __typename?: 'Anlegg';
  /**
   * Begrep
   * Relations
   */
  fullmakt?: Maybe<Array<Maybe<Fullmakt>>>;
  /** Inherited Attributes */
  gyldighetsperiode?: Maybe<Periode>;
  /** Begrep */
  kode: Scalars['String']['output'];
  /** Begrep */
  navn: Scalars['String']['output'];
  /** Begrep */
  passiv?: Maybe<Scalars['Boolean']['output']>;
  /** Begrep */
  systemId: Identifikator;
};

export type Anmerkninger = {
  __typename?: 'Anmerkninger';
  /** Attributes */
  atferd: Scalars['Int']['output'];
  orden: Scalars['Int']['output'];
  /** Relations */
  skolear?: Maybe<Skolear>;
  systemId: Identifikator;
};

export type Ansvar = {
  __typename?: 'Ansvar';
  fullmakt?: Maybe<Array<Maybe<Fullmakt>>>;
  /** Inherited Attributes */
  gyldighetsperiode?: Maybe<Periode>;
  /** Begrep */
  kode: Scalars['String']['output'];
  /** Begrep */
  navn: Scalars['String']['output'];
  organisasjonselement?: Maybe<Array<Maybe<Organisasjonselement>>>;
  /**
   * Begrep
   * Relations
   */
  overordnet?: Maybe<Ansvar>;
  /** Begrep */
  passiv?: Maybe<Scalars['Boolean']['output']>;
  /** Begrep */
  systemId: Identifikator;
  underordnet?: Maybe<Array<Maybe<Ansvar>>>;
};

export type Arbeidsforhold = {
  __typename?: 'Arbeidsforhold';
  /** Relations */
  aktivitet?: Maybe<Aktivitet>;
  anlegg?: Maybe<Anlegg>;
  /** Attributes */
  ansettelsesprosent: Scalars['Long']['output'];
  ansvar?: Maybe<Ansvar>;
  arbeidsforholdsperiode?: Maybe<Periode>;
  arbeidsforholdstype?: Maybe<Arbeidsforholdstype>;
  arbeidslokasjon?: Maybe<Arbeidslokasjon>;
  arbeidssted: Organisasjonselement;
  arslonn: Scalars['Long']['output'];
  art?: Maybe<Art>;
  diverse?: Maybe<Diverse>;
  fastlonn?: Maybe<Array<Maybe<Fastlonn>>>;
  fasttillegg?: Maybe<Array<Maybe<Fasttillegg>>>;
  formal?: Maybe<Formal>;
  funksjon?: Maybe<Funksjon>;
  gyldighetsperiode: Periode;
  hovedstilling: Scalars['Boolean']['output'];
  kontrakt?: Maybe<Kontrakt>;
  lonn?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  lonnsprosent: Scalars['Long']['output'];
  lopenummer?: Maybe<Lopenummer>;
  objekt?: Maybe<Objekt>;
  personalleder?: Maybe<Personalressurs>;
  personalressurs: Personalressurs;
  prosjekt?: Maybe<Prosjekt>;
  ramme?: Maybe<Ramme>;
  stillingskode?: Maybe<Stillingskode>;
  stillingsnummer: Scalars['String']['output'];
  stillingstittel?: Maybe<Scalars['String']['output']>;
  systemId: Identifikator;
  tilstedeprosent: Scalars['Long']['output'];
  timerPerUke?: Maybe<Uketimetall>;
  undervisningsforhold?: Maybe<Undervisningsforhold>;
  variabellonn?: Maybe<Array<Maybe<Variabellonn>>>;
};

export type Arbeidsforholdstype = {
  __typename?: 'Arbeidsforholdstype';
  /**
   * Begrep
   * Relations
   */
  forelder?: Maybe<Arbeidsforholdstype>;
  /** Inherited Attributes */
  gyldighetsperiode?: Maybe<Periode>;
  /** Begrep */
  kode: Scalars['String']['output'];
  /** Begrep */
  navn: Scalars['String']['output'];
  /** Begrep */
  passiv?: Maybe<Scalars['Boolean']['output']>;
  /** Begrep */
  systemId: Identifikator;
};

export type Arbeidslokasjon = {
  __typename?: 'Arbeidslokasjon';
  /**
   * Aktor
   * Relations
   */
  arbeidsforhold?: Maybe<Array<Maybe<Arbeidsforhold>>>;
  /** Inherited Attributes */
  forretningsadresse?: Maybe<Adresse>;
  /** Enhet */
  kontaktinformasjon?: Maybe<Kontaktinformasjon>;
  /** Attributes */
  lokasjonskode: Identifikator;
  lokasjonsnavn?: Maybe<Scalars['String']['output']>;
  /** Enhet */
  organisasjonsnavn?: Maybe<Scalars['String']['output']>;
  /** Enhet */
  organisasjonsnummer?: Maybe<Identifikator>;
  /** Aktor */
  postadresse?: Maybe<Adresse>;
};

export type Arstrinn = {
  __typename?: 'Arstrinn';
  basisgruppe?: Maybe<Array<Maybe<Basisgruppe>>>;
  /** Inherited Attributes */
  beskrivelse: Scalars['String']['output'];
  grepreferanse?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  medlemskap?: Maybe<Array<Maybe<Medlemskap>>>;
  /** Gruppe */
  navn: Scalars['String']['output'];
  /** Gruppe */
  periode: Array<Maybe<Periode>>;
  /**
   * Gruppe
   * Relations
   */
  programomrade?: Maybe<Array<Maybe<Programomrade>>>;
  /** Gruppe */
  systemId: Identifikator;
  vigoreferanse?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
};

export type Art = {
  __typename?: 'Art';
  /**
   * Begrep
   * Relations
   */
  fullmakt?: Maybe<Array<Maybe<Fullmakt>>>;
  /** Inherited Attributes */
  gyldighetsperiode?: Maybe<Periode>;
  /** Begrep */
  kode: Scalars['String']['output'];
  /** Begrep */
  navn: Scalars['String']['output'];
  /** Begrep */
  passiv?: Maybe<Scalars['Boolean']['output']>;
  /** Begrep */
  systemId: Identifikator;
};

export type Avbruddsarsak = {
  __typename?: 'Avbruddsarsak';
  /** Inherited Attributes */
  gyldighetsperiode?: Maybe<Periode>;
  /** Begrep */
  kode: Scalars['String']['output'];
  /** Begrep */
  navn: Scalars['String']['output'];
  /** Begrep */
  passiv?: Maybe<Scalars['Boolean']['output']>;
  /** Begrep */
  systemId: Identifikator;
};

export type AvlagtProve = {
  __typename?: 'AvlagtProve';
  bevistype?: Maybe<Bevistype>;
  brevtype?: Maybe<Brevtype>;
  fullfortkode?: Maybe<Fullfortkode>;
  larling: Larling;
  /** Attributes */
  provedato?: Maybe<Scalars['Date']['output']>;
  /** Relations */
  provestatus?: Maybe<Provestatus>;
  systemId: Identifikator;
};

export type Basisgruppe = {
  __typename?: 'Basisgruppe';
  /** Inherited Attributes */
  beskrivelse: Scalars['String']['output'];
  elevforhold?: Maybe<Array<Maybe<Elevforhold>>>;
  grepreferanse?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  gruppemedlemskap?: Maybe<Array<Maybe<Basisgruppemedlemskap>>>;
  kontaktlarergruppe?: Maybe<Array<Maybe<Kontaktlarergruppe>>>;
  medlemskap?: Maybe<Array<Maybe<Medlemskap>>>;
  /** Gruppe */
  navn: Scalars['String']['output'];
  /** Gruppe */
  periode: Array<Maybe<Periode>>;
  skole: Skole;
  /**
   * Gruppe
   * Relations
   */
  skolear?: Maybe<Skolear>;
  /** Gruppe */
  systemId: Identifikator;
  termin?: Maybe<Array<Maybe<Termin>>>;
  trinn: Arstrinn;
  undervisningsforhold?: Maybe<Array<Maybe<Undervisningsforhold>>>;
  vigoreferanse?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
};

export type Basisgruppemedlemskap = {
  __typename?: 'Basisgruppemedlemskap';
  /**
   * Gruppemedlemskap
   * Relations
   */
  basisgruppe: Basisgruppe;
  elevforhold: Elevforhold;
  /** Inherited Attributes */
  gyldighetsperiode?: Maybe<Periode>;
  /** Gruppemedlemskap */
  systemId: Identifikator;
};

export type Betalingsstatus = {
  __typename?: 'Betalingsstatus';
  /** Inherited Attributes */
  gyldighetsperiode?: Maybe<Periode>;
  /** Begrep */
  kode: Scalars['String']['output'];
  /** Begrep */
  navn: Scalars['String']['output'];
  /** Begrep */
  passiv?: Maybe<Scalars['Boolean']['output']>;
  /** Begrep */
  systemId: Identifikator;
};

export type Bevistype = {
  __typename?: 'Bevistype';
  /** Inherited Attributes */
  gyldighetsperiode?: Maybe<Periode>;
  /** Begrep */
  kode: Scalars['String']['output'];
  /** Begrep */
  navn: Scalars['String']['output'];
  /** Begrep */
  passiv?: Maybe<Scalars['Boolean']['output']>;
  /** Begrep */
  systemId: Identifikator;
};

export type Brevtype = {
  __typename?: 'Brevtype';
  /** Inherited Attributes */
  gyldighetsperiode?: Maybe<Periode>;
  /** Begrep */
  kode: Scalars['String']['output'];
  /** Begrep */
  navn: Scalars['String']['output'];
  /** Begrep */
  passiv?: Maybe<Scalars['Boolean']['output']>;
  /** Begrep */
  systemId: Identifikator;
};

export type Diverse = {
  __typename?: 'Diverse';
  /**
   * Begrep
   * Relations
   */
  fullmakt?: Maybe<Array<Maybe<Fullmakt>>>;
  /** Inherited Attributes */
  gyldighetsperiode?: Maybe<Periode>;
  /** Begrep */
  kode: Scalars['String']['output'];
  /** Begrep */
  navn: Scalars['String']['output'];
  /** Begrep */
  passiv?: Maybe<Scalars['Boolean']['output']>;
  /** Begrep */
  systemId: Identifikator;
};

export type Eksamen = {
  __typename?: 'Eksamen';
  /** Attributes */
  beskrivelse?: Maybe<Scalars['String']['output']>;
  eksamensgruppe?: Maybe<Array<Maybe<Eksamensgruppe>>>;
  navn: Scalars['String']['output'];
  oppmotetidspunkt?: Maybe<Scalars['Date']['output']>;
  /** Relations */
  rom?: Maybe<Array<Maybe<Rom>>>;
  systemId: Identifikator;
  tidsrom: Periode;
};

export type Eksamensform = {
  __typename?: 'Eksamensform';
  /** Inherited Attributes */
  gyldighetsperiode?: Maybe<Periode>;
  /** Begrep */
  kode: Scalars['String']['output'];
  /** Begrep */
  navn: Scalars['String']['output'];
  /** Begrep */
  passiv?: Maybe<Scalars['Boolean']['output']>;
  /** Begrep */
  systemId: Identifikator;
};

export type Eksamensgruppe = {
  __typename?: 'Eksamensgruppe';
  /** Inherited Attributes */
  beskrivelse: Scalars['String']['output'];
  eksamen?: Maybe<Eksamen>;
  /** Attributes */
  eksamensdato?: Maybe<Scalars['Date']['output']>;
  eksamensform?: Maybe<Eksamensform>;
  /**
   * Gruppe
   * Relations
   */
  elevforhold?: Maybe<Array<Maybe<Elevforhold>>>;
  fag: Fag;
  grepreferanse?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  gruppemedlemskap?: Maybe<Array<Maybe<Eksamensgruppemedlemskap>>>;
  medlemskap?: Maybe<Array<Maybe<Medlemskap>>>;
  /** Gruppe */
  navn: Scalars['String']['output'];
  /** Gruppe */
  periode: Array<Maybe<Periode>>;
  sensor?: Maybe<Array<Maybe<Sensor>>>;
  skole: Skole;
  skolear?: Maybe<Skolear>;
  /** Gruppe */
  systemId: Identifikator;
  termin: Termin;
  undervisningsforhold?: Maybe<Array<Maybe<Undervisningsforhold>>>;
  vigoreferanse?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
};

export type Eksamensgruppemedlemskap = {
  __typename?: 'Eksamensgruppemedlemskap';
  betalingsstatus?: Maybe<Betalingsstatus>;
  /** Attributes */
  delegert?: Maybe<Scalars['Boolean']['output']>;
  /**
   * Gruppemedlemskap
   * Relations
   */
  delegertTil?: Maybe<Fylke>;
  eksamensgruppe: Eksamensgruppe;
  elevforhold: Elevforhold;
  foretrukketSensor?: Maybe<Sensor>;
  foretrukketSkole?: Maybe<Skole>;
  /** Inherited Attributes */
  gyldighetsperiode?: Maybe<Periode>;
  kandidatnummer?: Maybe<Scalars['String']['output']>;
  nus?: Maybe<Karakterstatus>;
  /** Gruppemedlemskap */
  systemId: Identifikator;
};

export type Eksamensvurdering = {
  __typename?: 'Eksamensvurdering';
  /**
   * Fagvurdering
   * Relations
   */
  eksamensgruppe: Eksamensgruppe;
  elevvurdering: Elevvurdering;
  fag: Fag;
  karakter?: Maybe<Karakterverdi>;
  karakterhistorie?: Maybe<Karakterhistorie>;
  /** Inherited Attributes */
  kommentar: Scalars['String']['output'];
  skolear?: Maybe<Skolear>;
  /** Fagvurdering */
  systemId: Identifikator;
  undervisningsgruppe?: Maybe<Undervisningsgruppe>;
  /** Fagvurdering */
  vurderingsdato: Scalars['Date']['output'];
};

export type Elev = {
  __typename?: 'Elev';
  /** Attributes */
  brukernavn?: Maybe<Identifikator>;
  elevforhold?: Maybe<Array<Maybe<Elevforhold>>>;
  elevnummer?: Maybe<Identifikator>;
  feidenavn?: Maybe<Identifikator>;
  gjest?: Maybe<Scalars['Boolean']['output']>;
  hybeladresse?: Maybe<Adresse>;
  kontaktinformasjon?: Maybe<Kontaktinformasjon>;
  /** Relations */
  person: Person;
  systemId: Identifikator;
};

export type Elevforhold = {
  __typename?: 'Elevforhold';
  /** Attributes */
  anmerkninger: Array<Maybe<Anmerkninger>>;
  avbruddsarsak?: Maybe<Array<Maybe<Avbruddsarsak>>>;
  avbruddsdato?: Maybe<Scalars['Date']['output']>;
  basisgruppe?: Maybe<Array<Maybe<Basisgruppe>>>;
  basisgruppemedlemskap?: Maybe<Array<Maybe<Basisgruppemedlemskap>>>;
  /** Inherited Attributes */
  beskrivelse: Scalars['String']['output'];
  eksamensgruppe?: Maybe<Array<Maybe<Eksamensgruppe>>>;
  eksamensgruppemedlemskap?: Maybe<Array<Maybe<Eksamensgruppemedlemskap>>>;
  /**
   * Utdanningsforhold
   * Relations
   */
  elev: Elev;
  elevfravar?: Maybe<Array<Maybe<Fravarsoversikt>>>;
  elevvurdering?: Maybe<Elevvurdering>;
  faggruppemedlemskap?: Maybe<Array<Maybe<Faggruppemedlemskap>>>;
  fravarsregistreringer?: Maybe<Elevfravar>;
  gyldighetsperiode?: Maybe<Periode>;
  halvarsfagvurdering?: Maybe<Array<Maybe<Halvarsfagvurdering>>>;
  halvarsordensvurdering?: Maybe<Array<Maybe<Halvarsordensvurdering>>>;
  hovedskole?: Maybe<Scalars['Boolean']['output']>;
  kategori?: Maybe<Elevkategori>;
  kontaktlarergruppe?: Maybe<Array<Maybe<Kontaktlarergruppe>>>;
  kontaktlarergruppemedlemskap?: Maybe<Array<Maybe<Kontaktlarergruppemedlemskap>>>;
  kroppsoving?: Maybe<Fagmerknad>;
  medlemskap?: Maybe<Array<Maybe<Medlemskap>>>;
  persongruppemedlemskap?: Maybe<Array<Maybe<Persongruppemedlemskap>>>;
  programomrade?: Maybe<Programomrade>;
  programomrademedlemskap?: Maybe<Array<Maybe<Programomrademedlemskap>>>;
  sidemal?: Maybe<Array<Maybe<Fagmerknad>>>;
  skole: Skole;
  skolear?: Maybe<Skolear>;
  sluttfagvurdering?: Maybe<Array<Maybe<Sluttfagvurdering>>>;
  sluttordensvurdering?: Maybe<Array<Maybe<Sluttordensvurdering>>>;
  /** Utdanningsforhold */
  systemId: Identifikator;
  tilrettelegging?: Maybe<Array<Maybe<Elevtilrettelegging>>>;
  tosprakligFagopplaring?: Maybe<Scalars['Boolean']['output']>;
  underveisfagvurdering?: Maybe<Array<Maybe<Underveisfagvurdering>>>;
  underveisordensvurdering?: Maybe<Array<Maybe<Underveisordensvurdering>>>;
  undervisningsgruppe?: Maybe<Array<Maybe<Undervisningsgruppe>>>;
  undervisningsgruppemedlemskap?: Maybe<Array<Maybe<Undervisningsgruppemedlemskap>>>;
  vurdering?: Maybe<Array<Maybe<Vurdering>>>;
};

export type Elevfravar = {
  __typename?: 'Elevfravar';
  elevforhold: Elevforhold;
  /** Relations */
  fravarsregistrering?: Maybe<Array<Maybe<Fravarsregistrering>>>;
  /** Attributes */
  systemId: Identifikator;
};

export type Elevkategori = {
  __typename?: 'Elevkategori';
  /** Inherited Attributes */
  gyldighetsperiode?: Maybe<Periode>;
  /** Begrep */
  kode: Scalars['String']['output'];
  /** Begrep */
  navn: Scalars['String']['output'];
  /** Begrep */
  passiv?: Maybe<Scalars['Boolean']['output']>;
  /** Begrep */
  systemId: Identifikator;
};

export type Elevtilrettelegging = {
  __typename?: 'Elevtilrettelegging';
  eksamensform?: Maybe<Eksamensform>;
  /** Relations */
  elev: Elevforhold;
  fag?: Maybe<Fag>;
  /** Attributes */
  systemId: Identifikator;
  tilrettelegging: Tilrettelegging;
};

export type Elevvurdering = {
  __typename?: 'Elevvurdering';
  eksamensvurdering?: Maybe<Array<Maybe<Eksamensvurdering>>>;
  /** Relations */
  elevforhold: Elevforhold;
  halvarsfagvurdering?: Maybe<Array<Maybe<Halvarsfagvurdering>>>;
  halvarsordensvurdering?: Maybe<Array<Maybe<Halvarsordensvurdering>>>;
  sluttfagvurdering?: Maybe<Array<Maybe<Sluttfagvurdering>>>;
  sluttordensvurdering?: Maybe<Array<Maybe<Sluttordensvurdering>>>;
  /** Attributes */
  systemId: Identifikator;
  underveisfagvurdering?: Maybe<Array<Maybe<Underveisfagvurdering>>>;
  underveisordensvurdering?: Maybe<Array<Maybe<Underveisordensvurdering>>>;
  vitnemalsmerknad?: Maybe<Array<Maybe<Vitnemalsmerknad>>>;
};

export type Fag = {
  __typename?: 'Fag';
  /** Inherited Attributes */
  beskrivelse: Scalars['String']['output'];
  eksamensgruppe?: Maybe<Array<Maybe<Eksamensgruppe>>>;
  faggruppe?: Maybe<Array<Maybe<Faggruppe>>>;
  grepreferanse?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  medlemskap?: Maybe<Array<Maybe<Medlemskap>>>;
  /** Gruppe */
  navn: Scalars['String']['output'];
  /** Gruppe */
  periode: Array<Maybe<Periode>>;
  /**
   * Gruppe
   * Relations
   */
  programomrade?: Maybe<Array<Maybe<Programomrade>>>;
  skole?: Maybe<Array<Maybe<Skole>>>;
  /** Gruppe */
  systemId: Identifikator;
  tilrettelegging?: Maybe<Array<Maybe<Elevtilrettelegging>>>;
  undervisningsgruppe?: Maybe<Array<Maybe<Undervisningsgruppe>>>;
  vigoreferanse?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
};

export type Faggruppe = {
  __typename?: 'Faggruppe';
  /** Inherited Attributes */
  beskrivelse: Scalars['String']['output'];
  /**
   * Gruppe
   * Relations
   */
  fag: Fag;
  faggruppemedlemskap?: Maybe<Array<Maybe<Faggruppemedlemskap>>>;
  grepreferanse?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  medlemskap?: Maybe<Array<Maybe<Medlemskap>>>;
  /** Gruppe */
  navn: Scalars['String']['output'];
  /** Gruppe */
  periode: Array<Maybe<Periode>>;
  skole?: Maybe<Skole>;
  skolear?: Maybe<Skolear>;
  /** Gruppe */
  systemId: Identifikator;
  vigoreferanse?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
};

export type Faggruppemedlemskap = {
  __typename?: 'Faggruppemedlemskap';
  elevforhold: Elevforhold;
  faggruppe: Faggruppe;
  /**
   * Gruppemedlemskap
   * Relations
   */
  fagmerknad?: Maybe<Fagmerknad>;
  fagstatus?: Maybe<Fagstatus>;
  /** Inherited Attributes */
  gyldighetsperiode?: Maybe<Periode>;
  /** Gruppemedlemskap */
  systemId: Identifikator;
  varsel?: Maybe<Array<Maybe<Varsel>>>;
};

export type Fagmerknad = {
  __typename?: 'Fagmerknad';
  /** Inherited Attributes */
  gyldighetsperiode?: Maybe<Periode>;
  /** Begrep */
  kode: Scalars['String']['output'];
  /** Begrep */
  navn: Scalars['String']['output'];
  /** Begrep */
  passiv?: Maybe<Scalars['Boolean']['output']>;
  /** Begrep */
  systemId: Identifikator;
};

export type Fagstatus = {
  __typename?: 'Fagstatus';
  /** Inherited Attributes */
  gyldighetsperiode?: Maybe<Periode>;
  /** Begrep */
  kode: Scalars['String']['output'];
  /** Begrep */
  navn: Scalars['String']['output'];
  /** Begrep */
  passiv?: Maybe<Scalars['Boolean']['output']>;
  /** Begrep */
  systemId: Identifikator;
};

export type Fastlonn = {
  __typename?: 'Fastlonn';
  anviser?: Maybe<Personalressurs>;
  /** Inherited Attributes */
  anvist?: Maybe<Scalars['Date']['output']>;
  arbeidsforhold: Arbeidsforhold;
  attestant?: Maybe<Personalressurs>;
  /** Lonn */
  attestert?: Maybe<Scalars['Date']['output']>;
  /** Lonn */
  beskrivelse: Scalars['String']['output'];
  /** Lonn */
  kildesystemId?: Maybe<Identifikator>;
  konterer?: Maybe<Personalressurs>;
  /** Lonn */
  kontert?: Maybe<Scalars['Date']['output']>;
  /** Lonn */
  kontostreng: Kontostreng;
  /**
   * Lonn
   * Relations
   */
  lonnsart?: Maybe<Lonnsart>;
  /** Lonn */
  opptjent?: Maybe<Periode>;
  /** Lonn */
  periode: Periode;
  /** Attributes */
  prosent: Scalars['Long']['output'];
  /** Lonn */
  systemId?: Maybe<Identifikator>;
};

export type Fasttillegg = {
  __typename?: 'Fasttillegg';
  anviser?: Maybe<Personalressurs>;
  /** Inherited Attributes */
  anvist?: Maybe<Scalars['Date']['output']>;
  arbeidsforhold: Arbeidsforhold;
  attestant?: Maybe<Personalressurs>;
  /** Lonn */
  attestert?: Maybe<Scalars['Date']['output']>;
  /** Attributes */
  belop: Scalars['Long']['output'];
  /** Lonn */
  beskrivelse: Scalars['String']['output'];
  /** Lonn */
  kildesystemId?: Maybe<Identifikator>;
  konterer?: Maybe<Personalressurs>;
  /** Lonn */
  kontert?: Maybe<Scalars['Date']['output']>;
  /** Lonn */
  kontostreng: Kontostreng;
  /**
   * Lonn
   * Relations
   */
  lonnsart: Lonnsart;
  /** Lonn */
  opptjent?: Maybe<Periode>;
  /** Lonn */
  periode: Periode;
  /** Lonn */
  systemId?: Maybe<Identifikator>;
};

export type Formal = {
  __typename?: 'Formal';
  /**
   * Begrep
   * Relations
   */
  fullmakt?: Maybe<Array<Maybe<Fullmakt>>>;
  /** Inherited Attributes */
  gyldighetsperiode?: Maybe<Periode>;
  /** Begrep */
  kode: Scalars['String']['output'];
  /** Begrep */
  navn: Scalars['String']['output'];
  /** Begrep */
  passiv?: Maybe<Scalars['Boolean']['output']>;
  /** Begrep */
  systemId: Identifikator;
};

export type Fravarsoversikt = {
  __typename?: 'Fravarsoversikt';
  /** Relations */
  elevforhold: Elevforhold;
  fag: Fag;
  /** Attributes */
  halvar: Fravarsprosent;
  skolear: Fravarsprosent;
  systemId: Identifikator;
};

export type Fravarsprosent = {
  __typename?: 'Fravarsprosent';
  /** Attributes */
  fravarstimer: Scalars['Int']['output'];
  prosent: Scalars['Int']['output'];
  undervisningstimer: Scalars['Int']['output'];
};

export type Fravarsregistrering = {
  __typename?: 'Fravarsregistrering';
  elevfravar: Elevfravar;
  faggruppe?: Maybe<Faggruppe>;
  /** Attributes */
  foresPaVitnemal: Scalars['Boolean']['output'];
  kommentar?: Maybe<Scalars['String']['output']>;
  periode: Periode;
  /** Relations */
  registrertAv?: Maybe<Skoleressurs>;
  systemId: Identifikator;
  undervisningsgruppe: Undervisningsgruppe;
};

export type Fullfortkode = {
  __typename?: 'Fullfortkode';
  /** Inherited Attributes */
  gyldighetsperiode?: Maybe<Periode>;
  /** Begrep */
  kode: Scalars['String']['output'];
  /** Begrep */
  navn: Scalars['String']['output'];
  /** Begrep */
  passiv?: Maybe<Scalars['Boolean']['output']>;
  /** Begrep */
  systemId: Identifikator;
};

export type Fullmakt = {
  __typename?: 'Fullmakt';
  aktivitet?: Maybe<Aktivitet>;
  anlegg?: Maybe<Anlegg>;
  ansvar?: Maybe<Ansvar>;
  art?: Maybe<Art>;
  diverse?: Maybe<Diverse>;
  formal?: Maybe<Formal>;
  fullmektig?: Maybe<Personalressurs>;
  funksjon?: Maybe<Funksjon>;
  /** Attributes */
  gyldighetsperiode: Periode;
  kontrakt?: Maybe<Kontrakt>;
  lopenummer?: Maybe<Lopenummer>;
  /** Relations */
  myndighet?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  objekt?: Maybe<Objekt>;
  organisasjonselement?: Maybe<Organisasjonselement>;
  prosjekt?: Maybe<Prosjekt>;
  ramme?: Maybe<Ramme>;
  rolle: Rolle;
  stedfortreder?: Maybe<Personalressurs>;
  systemId: Identifikator;
};

export type Funksjon = {
  __typename?: 'Funksjon';
  fullmakt?: Maybe<Array<Maybe<Fullmakt>>>;
  /** Inherited Attributes */
  gyldighetsperiode?: Maybe<Periode>;
  /** Begrep */
  kode: Scalars['String']['output'];
  /** Begrep */
  navn: Scalars['String']['output'];
  /**
   * Begrep
   * Relations
   */
  overordnet?: Maybe<Funksjon>;
  /** Begrep */
  passiv?: Maybe<Scalars['Boolean']['output']>;
  /** Begrep */
  systemId: Identifikator;
  underordnet?: Maybe<Array<Maybe<Funksjon>>>;
};

export type Fylke = {
  __typename?: 'Fylke';
  /** Inherited Attributes */
  gyldighetsperiode?: Maybe<Periode>;
  /** Begrep */
  kode: Scalars['String']['output'];
  /**
   * Begrep
   * Relations
   */
  kommune?: Maybe<Array<Maybe<Kommune>>>;
  /** Begrep */
  navn: Scalars['String']['output'];
  /** Begrep */
  passiv?: Maybe<Scalars['Boolean']['output']>;
  /** Begrep */
  systemId: Identifikator;
};

export type Halvarsfagvurdering = {
  __typename?: 'Halvarsfagvurdering';
  /**
   * Fagvurdering
   * Relations
   */
  elevforhold: Elevforhold;
  elevvurdering: Elevvurdering;
  fag: Fag;
  karakter?: Maybe<Karakterverdi>;
  /** Inherited Attributes */
  kommentar: Scalars['String']['output'];
  skolear?: Maybe<Skolear>;
  /** Fagvurdering */
  systemId: Identifikator;
  undervisningsgruppe?: Maybe<Undervisningsgruppe>;
  /** Fagvurdering */
  vurderingsdato: Scalars['Date']['output'];
};

export type Halvarsordensvurdering = {
  __typename?: 'Halvarsordensvurdering';
  atferd: Karakterverdi;
  /**
   * Ordensvurdering
   * Relations
   */
  elevforhold: Elevforhold;
  elevvurdering: Elevvurdering;
  /** Inherited Attributes */
  kommentar: Scalars['String']['output'];
  orden: Karakterverdi;
  skolear?: Maybe<Skolear>;
  /** Ordensvurdering */
  systemId: Identifikator;
  /** Ordensvurdering */
  vurderingsdato: Scalars['Date']['output'];
};

export type Identifikator = {
  __typename?: 'Identifikator';
  /** Attributes */
  gyldighetsperiode?: Maybe<Periode>;
  identifikatorverdi: Scalars['String']['output'];
};

export type Karakterhistorie = {
  __typename?: 'Karakterhistorie';
  /** Attributes */
  endretDato: Scalars['Date']['output'];
  karakterstatus?: Maybe<Karakterstatus>;
  karakterverdi?: Maybe<Karakterverdi>;
  /** Relations */
  oppdatertAv?: Maybe<Skoleressurs>;
  opprinneligKarakterstatus?: Maybe<Karakterstatus>;
  opprinneligKarakterverdi?: Maybe<Karakterverdi>;
  systemId: Identifikator;
};

export type Karakterskala = {
  __typename?: 'Karakterskala';
  /** Inherited Attributes */
  gyldighetsperiode?: Maybe<Periode>;
  /** Begrep */
  kode: Scalars['String']['output'];
  /** Begrep */
  navn: Scalars['String']['output'];
  /** Begrep */
  passiv?: Maybe<Scalars['Boolean']['output']>;
  /** Begrep */
  systemId: Identifikator;
  verdi?: Maybe<Array<Maybe<Karakterverdi>>>;
  /**
   * Begrep
   * Relations
   */
  vigoreferanse?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
};

export type Karakterstatus = {
  __typename?: 'Karakterstatus';
  /** Inherited Attributes */
  gyldighetsperiode?: Maybe<Periode>;
  /** Begrep */
  kode: Scalars['String']['output'];
  /** Begrep */
  navn: Scalars['String']['output'];
  /** Begrep */
  passiv?: Maybe<Scalars['Boolean']['output']>;
  /** Begrep */
  systemId: Identifikator;
};

export type Karakterverdi = {
  __typename?: 'Karakterverdi';
  /** Inherited Attributes */
  gyldighetsperiode?: Maybe<Periode>;
  /** Begrep */
  kode: Scalars['String']['output'];
  /** Begrep */
  navn: Scalars['String']['output'];
  /** Begrep */
  passiv?: Maybe<Scalars['Boolean']['output']>;
  /**
   * Begrep
   * Relations
   */
  skala: Karakterskala;
  /** Begrep */
  systemId: Identifikator;
};

export type Kjonn = {
  __typename?: 'Kjonn';
  /** Inherited Attributes */
  gyldighetsperiode?: Maybe<Periode>;
  /** Begrep */
  kode: Scalars['String']['output'];
  /** Begrep */
  navn: Scalars['String']['output'];
  /** Begrep */
  passiv?: Maybe<Scalars['Boolean']['output']>;
  /** Begrep */
  systemId: Identifikator;
};

export type Kommune = {
  __typename?: 'Kommune';
  /**
   * Begrep
   * Relations
   */
  fylke: Fylke;
  /** Inherited Attributes */
  gyldighetsperiode?: Maybe<Periode>;
  /** Begrep */
  kode: Scalars['String']['output'];
  /** Begrep */
  navn: Scalars['String']['output'];
  /** Begrep */
  passiv?: Maybe<Scalars['Boolean']['output']>;
  /** Begrep */
  systemId: Identifikator;
};

export type Kontaktinformasjon = {
  __typename?: 'Kontaktinformasjon';
  /** Attributes */
  epostadresse?: Maybe<Scalars['String']['output']>;
  mobiltelefonnummer?: Maybe<Scalars['String']['output']>;
  nettsted?: Maybe<Scalars['String']['output']>;
  sip?: Maybe<Scalars['String']['output']>;
  telefonnummer?: Maybe<Scalars['String']['output']>;
};

export type Kontaktlarergruppe = {
  __typename?: 'Kontaktlarergruppe';
  /**
   * Gruppe
   * Relations
   */
  basisgruppe: Array<Maybe<Basisgruppe>>;
  /** Inherited Attributes */
  beskrivelse: Scalars['String']['output'];
  elevforhold?: Maybe<Array<Maybe<Elevforhold>>>;
  grepreferanse?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  gruppemedlemskap?: Maybe<Array<Maybe<Kontaktlarergruppemedlemskap>>>;
  medlemskap?: Maybe<Array<Maybe<Medlemskap>>>;
  /** Gruppe */
  navn: Scalars['String']['output'];
  /** Gruppe */
  periode: Array<Maybe<Periode>>;
  skole: Skole;
  skolear?: Maybe<Skolear>;
  /** Gruppe */
  systemId: Identifikator;
  termin?: Maybe<Array<Maybe<Termin>>>;
  undervisningsforhold?: Maybe<Array<Maybe<Undervisningsforhold>>>;
  vigoreferanse?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
};

export type Kontaktlarergruppemedlemskap = {
  __typename?: 'Kontaktlarergruppemedlemskap';
  /**
   * Gruppemedlemskap
   * Relations
   */
  elevforhold: Elevforhold;
  /** Inherited Attributes */
  gyldighetsperiode?: Maybe<Periode>;
  kontaktlarergruppe: Kontaktlarergruppe;
  /** Gruppemedlemskap */
  systemId: Identifikator;
};

export type Kontaktperson = {
  __typename?: 'Kontaktperson';
  /** Attributes */
  foreldreansvar?: Maybe<Scalars['Boolean']['output']>;
  kontaktinformasjon?: Maybe<Kontaktinformasjon>;
  /** Relations */
  kontaktperson?: Maybe<Array<Maybe<Person>>>;
  navn?: Maybe<Personnavn>;
  person?: Maybe<Person>;
  systemId: Identifikator;
  type: Scalars['String']['output'];
};

export type Kontostreng = {
  __typename?: 'Kontostreng';
  /** Relations */
  aktivitet?: Maybe<Aktivitet>;
  anlegg?: Maybe<Anlegg>;
  ansvar: Ansvar;
  art: Art;
  diverse?: Maybe<Diverse>;
  formal?: Maybe<Formal>;
  funksjon: Funksjon;
  kontrakt?: Maybe<Kontrakt>;
  lopenummer?: Maybe<Lopenummer>;
  objekt?: Maybe<Objekt>;
  prosjekt?: Maybe<Prosjekt>;
  prosjektart?: Maybe<Prosjektart>;
  ramme?: Maybe<Ramme>;
};

export type Kontrakt = {
  __typename?: 'Kontrakt';
  /**
   * Begrep
   * Relations
   */
  fullmakt?: Maybe<Array<Maybe<Fullmakt>>>;
  /** Inherited Attributes */
  gyldighetsperiode?: Maybe<Periode>;
  /** Begrep */
  kode: Scalars['String']['output'];
  /** Begrep */
  navn: Scalars['String']['output'];
  /** Begrep */
  passiv?: Maybe<Scalars['Boolean']['output']>;
  /** Begrep */
  systemId: Identifikator;
};

export type Landkode = {
  __typename?: 'Landkode';
  /** Inherited Attributes */
  gyldighetsperiode?: Maybe<Periode>;
  /** Begrep */
  kode: Scalars['String']['output'];
  /** Begrep */
  navn: Scalars['String']['output'];
  /** Begrep */
  passiv?: Maybe<Scalars['Boolean']['output']>;
  /** Begrep */
  systemId: Identifikator;
};

export type Larling = {
  __typename?: 'Larling';
  avlagtprove?: Maybe<Array<Maybe<AvlagtProve>>>;
  bedrift?: Maybe<Virksomhet>;
  /** Attributes */
  kontraktstype?: Maybe<Scalars['String']['output']>;
  laretid?: Maybe<Periode>;
  /** Relations */
  person: Person;
  programomrade?: Maybe<Programomrade>;
  systemId: Identifikator;
};

export type Lonnsart = {
  __typename?: 'Lonnsart';
  /**
   * Begrep
   * Relations
   */
  art?: Maybe<Art>;
  /** Inherited Attributes */
  gyldighetsperiode?: Maybe<Periode>;
  /** Attributes */
  kategori?: Maybe<Scalars['String']['output']>;
  /** Begrep */
  kode: Scalars['String']['output'];
  /** Begrep */
  navn: Scalars['String']['output'];
  /** Begrep */
  passiv?: Maybe<Scalars['Boolean']['output']>;
  /** Begrep */
  systemId: Identifikator;
};

export type Lopenummer = {
  __typename?: 'Lopenummer';
  /**
   * Begrep
   * Relations
   */
  fullmakt?: Maybe<Array<Maybe<Fullmakt>>>;
  /** Inherited Attributes */
  gyldighetsperiode?: Maybe<Periode>;
  /** Begrep */
  kode: Scalars['String']['output'];
  /** Begrep */
  navn: Scalars['String']['output'];
  /** Begrep */
  passiv?: Maybe<Scalars['Boolean']['output']>;
  /** Begrep */
  systemId: Identifikator;
};

export type Medlemskap = {
  __typename?: 'Medlemskap';
  endeligVurdering?: Maybe<Vurdering>;
  fortlopendeVurdering?: Maybe<Array<Maybe<Vurdering>>>;
  gruppe?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  /** Relations */
  medlem?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  /** Attributes */
  systemId: Identifikator;
};

export type Objekt = {
  __typename?: 'Objekt';
  /**
   * Begrep
   * Relations
   */
  fullmakt?: Maybe<Array<Maybe<Fullmakt>>>;
  /** Inherited Attributes */
  gyldighetsperiode?: Maybe<Periode>;
  /** Begrep */
  kode: Scalars['String']['output'];
  /** Begrep */
  navn: Scalars['String']['output'];
  /** Begrep */
  passiv?: Maybe<Scalars['Boolean']['output']>;
  /** Begrep */
  systemId: Identifikator;
};

export type Organisasjonselement = {
  __typename?: 'Organisasjonselement';
  /**
   * Aktor
   * Relations
   */
  ansvar?: Maybe<Array<Maybe<Ansvar>>>;
  arbeidsforhold?: Maybe<Array<Maybe<Arbeidsforhold>>>;
  /** Inherited Attributes */
  forretningsadresse?: Maybe<Adresse>;
  /** Attributes */
  gyldighetsperiode?: Maybe<Periode>;
  /** Enhet */
  kontaktinformasjon?: Maybe<Kontaktinformasjon>;
  kortnavn?: Maybe<Scalars['String']['output']>;
  leder?: Maybe<Personalressurs>;
  navn?: Maybe<Scalars['String']['output']>;
  organisasjonsId: Identifikator;
  organisasjonsKode: Identifikator;
  /** Enhet */
  organisasjonsnavn?: Maybe<Scalars['String']['output']>;
  /** Enhet */
  organisasjonsnummer?: Maybe<Identifikator>;
  organisasjonstype?: Maybe<Organisasjonstype>;
  overordnet: Organisasjonselement;
  /** Aktor */
  postadresse?: Maybe<Adresse>;
  skole?: Maybe<Skole>;
  underordnet?: Maybe<Array<Maybe<Organisasjonselement>>>;
};

export type Organisasjonstype = {
  __typename?: 'Organisasjonstype';
  /** Inherited Attributes */
  gyldighetsperiode?: Maybe<Periode>;
  /** Begrep */
  kode: Scalars['String']['output'];
  /** Begrep */
  navn: Scalars['String']['output'];
  /** Begrep */
  passiv?: Maybe<Scalars['Boolean']['output']>;
  /** Begrep */
  systemId: Identifikator;
};

export type OtEnhet = {
  __typename?: 'OtEnhet';
  /** Inherited Attributes */
  gyldighetsperiode?: Maybe<Periode>;
  /** Begrep */
  kode: Scalars['String']['output'];
  /**
   * Begrep
   * Relations
   */
  kommune: Kommune;
  /** Begrep */
  navn: Scalars['String']['output'];
  /** Begrep */
  passiv?: Maybe<Scalars['Boolean']['output']>;
  /** Begrep */
  systemId: Identifikator;
};

export type OtStatus = {
  __typename?: 'OtStatus';
  /** Attributes */
  beskrivelse?: Maybe<Scalars['String']['output']>;
  /** Inherited Attributes */
  gyldighetsperiode?: Maybe<Periode>;
  /** Begrep */
  kode: Scalars['String']['output'];
  /** Begrep */
  navn: Scalars['String']['output'];
  /** Begrep */
  passiv?: Maybe<Scalars['Boolean']['output']>;
  /** Begrep */
  systemId: Identifikator;
  type: Scalars['String']['output'];
};

export type OtUngdom = {
  __typename?: 'OtUngdom';
  enhet?: Maybe<OtEnhet>;
  /** Relations */
  person: Person;
  programomrade?: Maybe<Programomrade>;
  status?: Maybe<OtStatus>;
  /** Attributes */
  systemId: Identifikator;
};

export type Periode = {
  __typename?: 'Periode';
  /** Attributes */
  beskrivelse?: Maybe<Scalars['String']['output']>;
  slutt?: Maybe<Scalars['Date']['output']>;
  start: Scalars['Date']['output'];
};

export type Person = {
  __typename?: 'Person';
  /** Attributes */
  bilde?: Maybe<Scalars['String']['output']>;
  bostedsadresse?: Maybe<Adresse>;
  elev?: Maybe<Elev>;
  fodselsdato?: Maybe<Scalars['Date']['output']>;
  fodselsnummer: Identifikator;
  foreldre?: Maybe<Array<Maybe<Person>>>;
  foreldreansvar?: Maybe<Array<Maybe<Person>>>;
  kjonn?: Maybe<Kjonn>;
  kommune?: Maybe<Kommune>;
  /** Inherited Attributes */
  kontaktinformasjon?: Maybe<Kontaktinformasjon>;
  larling?: Maybe<Array<Maybe<Larling>>>;
  malform?: Maybe<Sprak>;
  morsmal?: Maybe<Sprak>;
  navn: Personnavn;
  otungdom?: Maybe<OtUngdom>;
  parorende?: Maybe<Array<Maybe<Kontaktperson>>>;
  personalressurs?: Maybe<Personalressurs>;
  /** Aktor */
  postadresse?: Maybe<Adresse>;
  /**
   * Aktor
   * Relations
   */
  statsborgerskap?: Maybe<Array<Maybe<Landkode>>>;
};

export type Personalressurs = {
  __typename?: 'Personalressurs';
  /** Attributes */
  ansattnummer: Identifikator;
  ansettelsesperiode: Periode;
  ansiennitet?: Maybe<Scalars['Date']['output']>;
  arbeidsforhold?: Maybe<Array<Maybe<Arbeidsforhold>>>;
  brukernavn?: Maybe<Identifikator>;
  fullmakt?: Maybe<Array<Maybe<Fullmakt>>>;
  jobbtittel?: Maybe<Scalars['String']['output']>;
  kontaktinformasjon?: Maybe<Kontaktinformasjon>;
  leder?: Maybe<Array<Maybe<Organisasjonselement>>>;
  person: Person;
  personalansvar?: Maybe<Array<Maybe<Arbeidsforhold>>>;
  /** Relations */
  personalressurskategori: Personalressurskategori;
  skoleressurs?: Maybe<Skoleressurs>;
  stedfortreder?: Maybe<Array<Maybe<Fullmakt>>>;
  systemId?: Maybe<Identifikator>;
};

export type Personalressurskategori = {
  __typename?: 'Personalressurskategori';
  /** Inherited Attributes */
  gyldighetsperiode?: Maybe<Periode>;
  /** Begrep */
  kode: Scalars['String']['output'];
  /** Begrep */
  navn: Scalars['String']['output'];
  /** Begrep */
  passiv?: Maybe<Scalars['Boolean']['output']>;
  /** Begrep */
  systemId: Identifikator;
};

export type Persongruppe = {
  __typename?: 'Persongruppe';
  /** Inherited Attributes */
  beskrivelse: Scalars['String']['output'];
  /**
   * Gruppe
   * Relations
   */
  elev?: Maybe<Array<Maybe<Elev>>>;
  grepreferanse?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  medlemskap?: Maybe<Array<Maybe<Medlemskap>>>;
  /** Gruppe */
  navn: Scalars['String']['output'];
  /** Gruppe */
  periode: Array<Maybe<Periode>>;
  persongruppemedlemskap?: Maybe<Array<Maybe<Persongruppemedlemskap>>>;
  skole?: Maybe<Array<Maybe<Skole>>>;
  skolear?: Maybe<Array<Maybe<Skolear>>>;
  skoleressurs?: Maybe<Array<Maybe<Skoleressurs>>>;
  /** Gruppe */
  systemId: Identifikator;
  termin?: Maybe<Array<Maybe<Termin>>>;
  undervisningsforhold?: Maybe<Array<Maybe<Undervisningsforhold>>>;
  vigoreferanse?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
};

export type Persongruppemedlemskap = {
  __typename?: 'Persongruppemedlemskap';
  /**
   * Gruppemedlemskap
   * Relations
   */
  elevforhold?: Maybe<Elevforhold>;
  /** Inherited Attributes */
  gyldighetsperiode?: Maybe<Periode>;
  persongruppe: Persongruppe;
  /** Gruppemedlemskap */
  systemId: Identifikator;
};

export type Personnavn = {
  __typename?: 'Personnavn';
  /** Attributes */
  etternavn: Scalars['String']['output'];
  fornavn: Scalars['String']['output'];
  mellomnavn?: Maybe<Scalars['String']['output']>;
};

export type Programomrade = {
  __typename?: 'Programomrade';
  /** Inherited Attributes */
  beskrivelse: Scalars['String']['output'];
  /**
   * Gruppe
   * Relations
   */
  elevforhold?: Maybe<Array<Maybe<Elevforhold>>>;
  fag?: Maybe<Array<Maybe<Fag>>>;
  grepreferanse?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  gruppemedlemskap?: Maybe<Array<Maybe<Programomrademedlemskap>>>;
  medlemskap?: Maybe<Array<Maybe<Medlemskap>>>;
  /** Gruppe */
  navn: Scalars['String']['output'];
  /** Gruppe */
  periode: Array<Maybe<Periode>>;
  /** Gruppe */
  systemId: Identifikator;
  trinn?: Maybe<Array<Maybe<Arstrinn>>>;
  utdanningsprogram: Array<Maybe<Utdanningsprogram>>;
  vigoreferanse?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
};

export type Programomrademedlemskap = {
  __typename?: 'Programomrademedlemskap';
  /**
   * Gruppemedlemskap
   * Relations
   */
  elevforhold: Elevforhold;
  /** Inherited Attributes */
  gyldighetsperiode?: Maybe<Periode>;
  programomrade: Programomrade;
  /** Gruppemedlemskap */
  systemId: Identifikator;
};

export type Prosjekt = {
  __typename?: 'Prosjekt';
  fullmakt?: Maybe<Array<Maybe<Fullmakt>>>;
  /** Inherited Attributes */
  gyldighetsperiode?: Maybe<Periode>;
  /** Begrep */
  kode: Scalars['String']['output'];
  /** Begrep */
  navn: Scalars['String']['output'];
  /** Begrep */
  passiv?: Maybe<Scalars['Boolean']['output']>;
  /**
   * Begrep
   * Relations
   */
  prosjektart?: Maybe<Array<Maybe<Prosjektart>>>;
  /** Begrep */
  systemId: Identifikator;
};

export type Prosjektart = {
  __typename?: 'Prosjektart';
  fullmakt?: Maybe<Array<Maybe<Fullmakt>>>;
  /** Inherited Attributes */
  gyldighetsperiode?: Maybe<Periode>;
  /** Begrep */
  kode: Scalars['String']['output'];
  /** Begrep */
  navn: Scalars['String']['output'];
  overordnet?: Maybe<Prosjektart>;
  /** Begrep */
  passiv?: Maybe<Scalars['Boolean']['output']>;
  prosjekt?: Maybe<Prosjekt>;
  /** Begrep */
  systemId: Identifikator;
  /**
   * Begrep
   * Relations
   */
  underordnet?: Maybe<Array<Maybe<Prosjektart>>>;
};

export type Provestatus = {
  __typename?: 'Provestatus';
  /** Inherited Attributes */
  gyldighetsperiode?: Maybe<Periode>;
  /** Begrep */
  kode: Scalars['String']['output'];
  /** Begrep */
  navn: Scalars['String']['output'];
  /** Begrep */
  passiv?: Maybe<Scalars['Boolean']['output']>;
  /** Begrep */
  systemId: Identifikator;
};

export type Query = {
  __typename?: 'Query';
  anmerkninger?: Maybe<Anmerkninger>;
  arbeidsforhold?: Maybe<Arbeidsforhold>;
  arbeidslokasjon?: Maybe<Arbeidslokasjon>;
  arstrinn?: Maybe<Arstrinn>;
  avlagtprove?: Maybe<AvlagtProve>;
  basisgruppe?: Maybe<Basisgruppe>;
  basisgruppemedlemskap?: Maybe<Basisgruppemedlemskap>;
  eksamen?: Maybe<Eksamen>;
  eksamensgruppe?: Maybe<Eksamensgruppe>;
  eksamensgruppemedlemskap?: Maybe<Eksamensgruppemedlemskap>;
  eksamensvurdering?: Maybe<Eksamensvurdering>;
  elev?: Maybe<Elev>;
  elevforhold?: Maybe<Elevforhold>;
  elevfravar?: Maybe<Elevfravar>;
  elevtilrettelegging?: Maybe<Elevtilrettelegging>;
  elevvurdering?: Maybe<Elevvurdering>;
  fag?: Maybe<Fag>;
  faggruppe?: Maybe<Faggruppe>;
  faggruppemedlemskap?: Maybe<Faggruppemedlemskap>;
  fravarsoversikt?: Maybe<Fravarsoversikt>;
  fravarsregistrering?: Maybe<Fravarsregistrering>;
  fullmakt?: Maybe<Fullmakt>;
  halvarsfagvurdering?: Maybe<Halvarsfagvurdering>;
  halvarsordensvurdering?: Maybe<Halvarsordensvurdering>;
  karakterhistorie?: Maybe<Karakterhistorie>;
  karakterverdi?: Maybe<Karakterverdi>;
  kontaktlarergruppe?: Maybe<Kontaktlarergruppe>;
  kontaktlarergruppemedlemskap?: Maybe<Kontaktlarergruppemedlemskap>;
  kontaktperson?: Maybe<Kontaktperson>;
  larling?: Maybe<Larling>;
  medlemskap?: Maybe<Medlemskap>;
  organisasjonselement?: Maybe<Organisasjonselement>;
  otungdom?: Maybe<OtUngdom>;
  person?: Maybe<Person>;
  personalressurs?: Maybe<Personalressurs>;
  persongruppe?: Maybe<Persongruppe>;
  persongruppemedlemskap?: Maybe<Persongruppemedlemskap>;
  programomrade?: Maybe<Programomrade>;
  programomrademedlemskap?: Maybe<Programomrademedlemskap>;
  rolle?: Maybe<Rolle>;
  rom?: Maybe<Rom>;
  sensor?: Maybe<Sensor>;
  skole?: Maybe<Skole>;
  skoleressurs?: Maybe<Skoleressurs>;
  sluttfagvurdering?: Maybe<Sluttfagvurdering>;
  sluttordensvurdering?: Maybe<Sluttordensvurdering>;
  time?: Maybe<Time>;
  underveisfagvurdering?: Maybe<Underveisfagvurdering>;
  underveisordensvurdering?: Maybe<Underveisordensvurdering>;
  undervisningsforhold?: Maybe<Undervisningsforhold>;
  undervisningsgruppe?: Maybe<Undervisningsgruppe>;
  undervisningsgruppemedlemskap?: Maybe<Undervisningsgruppemedlemskap>;
  utdanningsprogram?: Maybe<Utdanningsprogram>;
  varsel?: Maybe<Varsel>;
  virksomhet?: Maybe<Virksomhet>;
  vurdering?: Maybe<Vurdering>;
};


export type QueryAnmerkningerArgs = {
  systemId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryArbeidsforholdArgs = {
  systemId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryArbeidslokasjonArgs = {
  lokasjonskode?: InputMaybe<Scalars['String']['input']>;
  organisasjonsnummer?: InputMaybe<Scalars['String']['input']>;
};


export type QueryArstrinnArgs = {
  systemId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryAvlagtproveArgs = {
  systemId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryBasisgruppeArgs = {
  systemId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryBasisgruppemedlemskapArgs = {
  systemId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryEksamenArgs = {
  systemId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryEksamensgruppeArgs = {
  systemId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryEksamensgruppemedlemskapArgs = {
  systemId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryEksamensvurderingArgs = {
  systemId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryElevArgs = {
  brukernavn?: InputMaybe<Scalars['String']['input']>;
  elevnummer?: InputMaybe<Scalars['String']['input']>;
  feidenavn?: InputMaybe<Scalars['String']['input']>;
  systemId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryElevforholdArgs = {
  systemId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryElevfravarArgs = {
  systemId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryElevtilretteleggingArgs = {
  systemId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryElevvurderingArgs = {
  systemId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryFagArgs = {
  systemId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryFaggruppeArgs = {
  systemId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryFaggruppemedlemskapArgs = {
  systemId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryFravarsoversiktArgs = {
  systemId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryFravarsregistreringArgs = {
  systemId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryFullmaktArgs = {
  systemId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHalvarsfagvurderingArgs = {
  systemId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHalvarsordensvurderingArgs = {
  systemId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryKarakterhistorieArgs = {
  systemId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryKarakterverdiArgs = {
  systemId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryKontaktlarergruppeArgs = {
  systemId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryKontaktlarergruppemedlemskapArgs = {
  systemId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryKontaktpersonArgs = {
  systemId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryLarlingArgs = {
  systemId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryMedlemskapArgs = {
  systemId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryOrganisasjonselementArgs = {
  organisasjonsId?: InputMaybe<Scalars['String']['input']>;
  organisasjonsKode?: InputMaybe<Scalars['String']['input']>;
  organisasjonsnummer?: InputMaybe<Scalars['String']['input']>;
};


export type QueryOtungdomArgs = {
  systemId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryPersonArgs = {
  fodselsnummer?: InputMaybe<Scalars['String']['input']>;
};


export type QueryPersonalressursArgs = {
  ansattnummer?: InputMaybe<Scalars['String']['input']>;
  brukernavn?: InputMaybe<Scalars['String']['input']>;
  systemId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryPersongruppeArgs = {
  systemId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryPersongruppemedlemskapArgs = {
  systemId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryProgramomradeArgs = {
  systemId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryProgramomrademedlemskapArgs = {
  systemId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryRolleArgs = {
  navn?: InputMaybe<Scalars['String']['input']>;
};


export type QueryRomArgs = {
  systemId?: InputMaybe<Scalars['String']['input']>;
};


export type QuerySensorArgs = {
  systemId?: InputMaybe<Scalars['String']['input']>;
};


export type QuerySkoleArgs = {
  organisasjonsnummer?: InputMaybe<Scalars['String']['input']>;
  skolenummer?: InputMaybe<Scalars['String']['input']>;
  systemId?: InputMaybe<Scalars['String']['input']>;
};


export type QuerySkoleressursArgs = {
  feidenavn?: InputMaybe<Scalars['String']['input']>;
  systemId?: InputMaybe<Scalars['String']['input']>;
};


export type QuerySluttfagvurderingArgs = {
  systemId?: InputMaybe<Scalars['String']['input']>;
};


export type QuerySluttordensvurderingArgs = {
  systemId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryTimeArgs = {
  systemId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryUnderveisfagvurderingArgs = {
  systemId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryUnderveisordensvurderingArgs = {
  systemId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryUndervisningsforholdArgs = {
  systemId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryUndervisningsgruppeArgs = {
  systemId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryUndervisningsgruppemedlemskapArgs = {
  systemId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryUtdanningsprogramArgs = {
  systemId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryVarselArgs = {
  systemId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryVirksomhetArgs = {
  organisasjonsnummer?: InputMaybe<Scalars['String']['input']>;
  virksomhetsId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryVurderingArgs = {
  systemId?: InputMaybe<Scalars['String']['input']>;
};

export type Ramme = {
  __typename?: 'Ramme';
  /**
   * Begrep
   * Relations
   */
  fullmakt?: Maybe<Array<Maybe<Fullmakt>>>;
  /** Inherited Attributes */
  gyldighetsperiode?: Maybe<Periode>;
  /** Begrep */
  kode: Scalars['String']['output'];
  /** Begrep */
  navn: Scalars['String']['output'];
  /** Begrep */
  passiv?: Maybe<Scalars['Boolean']['output']>;
  /** Begrep */
  systemId: Identifikator;
};

export type Rolle = {
  __typename?: 'Rolle';
  /** Attributes */
  beskrivelse: Scalars['String']['output'];
  /** Relations */
  fullmakt: Array<Maybe<Fullmakt>>;
  navn: Identifikator;
};

export type Rom = {
  __typename?: 'Rom';
  eksamen?: Maybe<Array<Maybe<Eksamen>>>;
  /** Attributes */
  navn?: Maybe<Scalars['String']['output']>;
  systemId: Identifikator;
  /** Relations */
  time?: Maybe<Array<Maybe<Time>>>;
};

export type Sensor = {
  __typename?: 'Sensor';
  /** Attributes */
  aktiv: Scalars['Boolean']['output'];
  eksamensgruppe: Eksamensgruppe;
  sensornummer?: Maybe<Scalars['Int']['output']>;
  /** Relations */
  skoleressurs: Skoleressurs;
  systemId: Identifikator;
};

export type Skole = {
  __typename?: 'Skole';
  basisgruppe?: Maybe<Array<Maybe<Basisgruppe>>>;
  /** Attributes */
  domenenavn?: Maybe<Scalars['String']['output']>;
  eksamensgruppe?: Maybe<Array<Maybe<Eksamensgruppe>>>;
  elevforhold?: Maybe<Array<Maybe<Elevforhold>>>;
  fag?: Maybe<Array<Maybe<Fag>>>;
  faggruppe?: Maybe<Array<Maybe<Faggruppe>>>;
  /** Inherited Attributes */
  forretningsadresse?: Maybe<Adresse>;
  juridiskNavn?: Maybe<Scalars['String']['output']>;
  /** Enhet */
  kontaktinformasjon?: Maybe<Kontaktinformasjon>;
  kontaktlarergruppe?: Maybe<Array<Maybe<Kontaktlarergruppe>>>;
  navn: Scalars['String']['output'];
  /**
   * Aktor
   * Relations
   */
  organisasjon?: Maybe<Organisasjonselement>;
  /** Enhet */
  organisasjonsnavn?: Maybe<Scalars['String']['output']>;
  /** Enhet */
  organisasjonsnummer?: Maybe<Identifikator>;
  /** Aktor */
  postadresse?: Maybe<Adresse>;
  skoleeierType?: Maybe<Skoleeiertype>;
  skolenummer: Identifikator;
  skoleressurs?: Maybe<Array<Maybe<Skoleressurs>>>;
  systemId: Identifikator;
  undervisningsforhold?: Maybe<Array<Maybe<Undervisningsforhold>>>;
  undervisningsgruppe?: Maybe<Array<Maybe<Undervisningsgruppe>>>;
  utdanningsprogram?: Maybe<Array<Maybe<Utdanningsprogram>>>;
  vigoreferanse?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
};

export type Skolear = {
  __typename?: 'Skolear';
  /** Inherited Attributes */
  gyldighetsperiode?: Maybe<Periode>;
  /** Begrep */
  kode: Scalars['String']['output'];
  /** Begrep */
  navn: Scalars['String']['output'];
  /** Begrep */
  passiv?: Maybe<Scalars['Boolean']['output']>;
  /** Begrep */
  systemId: Identifikator;
};

export type Skoleeiertype = {
  __typename?: 'Skoleeiertype';
  /** Inherited Attributes */
  gyldighetsperiode?: Maybe<Periode>;
  /** Begrep */
  kode: Scalars['String']['output'];
  /** Begrep */
  navn: Scalars['String']['output'];
  /** Begrep */
  passiv?: Maybe<Scalars['Boolean']['output']>;
  /** Begrep */
  systemId: Identifikator;
};

export type Skoleressurs = {
  __typename?: 'Skoleressurs';
  /** Attributes */
  feidenavn?: Maybe<Identifikator>;
  /** Relations */
  person?: Maybe<Person>;
  personalressurs: Personalressurs;
  sensor?: Maybe<Array<Maybe<Sensor>>>;
  skole?: Maybe<Array<Maybe<Skole>>>;
  systemId: Identifikator;
  undervisningsforhold?: Maybe<Array<Maybe<Undervisningsforhold>>>;
};

export type Sluttfagvurdering = {
  __typename?: 'Sluttfagvurdering';
  eksamensgruppe?: Maybe<Eksamensgruppe>;
  /**
   * Fagvurdering
   * Relations
   */
  elevforhold: Elevforhold;
  elevvurdering: Elevvurdering;
  fag: Fag;
  karakter?: Maybe<Karakterverdi>;
  karakterhistorie?: Maybe<Array<Maybe<Karakterhistorie>>>;
  /** Inherited Attributes */
  kommentar: Scalars['String']['output'];
  skolear?: Maybe<Skolear>;
  /** Fagvurdering */
  systemId: Identifikator;
  undervisningsgruppe?: Maybe<Undervisningsgruppe>;
  /** Fagvurdering */
  vurderingsdato: Scalars['Date']['output'];
};

export type Sluttordensvurdering = {
  __typename?: 'Sluttordensvurdering';
  atferd: Karakterverdi;
  /**
   * Ordensvurdering
   * Relations
   */
  elevforhold: Elevforhold;
  elevvurdering: Elevvurdering;
  /** Inherited Attributes */
  kommentar: Scalars['String']['output'];
  orden: Karakterverdi;
  skolear?: Maybe<Skolear>;
  /** Ordensvurdering */
  systemId: Identifikator;
  /** Ordensvurdering */
  vurderingsdato: Scalars['Date']['output'];
};

export type Sprak = {
  __typename?: 'Sprak';
  /** Inherited Attributes */
  gyldighetsperiode?: Maybe<Periode>;
  /** Begrep */
  kode: Scalars['String']['output'];
  /** Begrep */
  navn: Scalars['String']['output'];
  /** Begrep */
  passiv?: Maybe<Scalars['Boolean']['output']>;
  /** Begrep */
  systemId: Identifikator;
};

export type Stillingskode = {
  __typename?: 'Stillingskode';
  /**
   * Begrep
   * Relations
   */
  forelder?: Maybe<Stillingskode>;
  /** Inherited Attributes */
  gyldighetsperiode?: Maybe<Periode>;
  /** Begrep */
  kode: Scalars['String']['output'];
  /** Begrep */
  navn: Scalars['String']['output'];
  /** Begrep */
  passiv?: Maybe<Scalars['Boolean']['output']>;
  /** Begrep */
  systemId: Identifikator;
};

export type Termin = {
  __typename?: 'Termin';
  /** Inherited Attributes */
  gyldighetsperiode?: Maybe<Periode>;
  /** Begrep */
  kode: Scalars['String']['output'];
  /** Begrep */
  navn: Scalars['String']['output'];
  /** Begrep */
  passiv?: Maybe<Scalars['Boolean']['output']>;
  /** Begrep */
  systemId: Identifikator;
};

export type Tilrettelegging = {
  __typename?: 'Tilrettelegging';
  /** Inherited Attributes */
  gyldighetsperiode?: Maybe<Periode>;
  /** Begrep */
  kode: Scalars['String']['output'];
  /** Begrep */
  navn: Scalars['String']['output'];
  /** Begrep */
  passiv?: Maybe<Scalars['Boolean']['output']>;
  /** Begrep */
  systemId: Identifikator;
};

export type Time = {
  __typename?: 'Time';
  /** Attributes */
  beskrivelse?: Maybe<Scalars['String']['output']>;
  navn: Scalars['String']['output'];
  rom?: Maybe<Array<Maybe<Rom>>>;
  systemId: Identifikator;
  tidsrom: Periode;
  undervisningsforhold: Array<Maybe<Undervisningsforhold>>;
  /** Relations */
  undervisningsgruppe: Array<Maybe<Undervisningsgruppe>>;
};

export type Uketimetall = {
  __typename?: 'Uketimetall';
  /** Inherited Attributes */
  gyldighetsperiode?: Maybe<Periode>;
  /** Begrep */
  kode: Scalars['String']['output'];
  /** Begrep */
  navn: Scalars['String']['output'];
  /** Begrep */
  passiv?: Maybe<Scalars['Boolean']['output']>;
  /** Begrep */
  systemId: Identifikator;
};

export type Underveisfagvurdering = {
  __typename?: 'Underveisfagvurdering';
  /**
   * Fagvurdering
   * Relations
   */
  elevforhold: Elevforhold;
  elevvurdering: Elevvurdering;
  fag: Fag;
  karakter?: Maybe<Karakterverdi>;
  /** Inherited Attributes */
  kommentar: Scalars['String']['output'];
  skolear?: Maybe<Skolear>;
  /** Fagvurdering */
  systemId: Identifikator;
  undervisningsgruppe?: Maybe<Undervisningsgruppe>;
  /** Fagvurdering */
  vurderingsdato: Scalars['Date']['output'];
};

export type Underveisordensvurdering = {
  __typename?: 'Underveisordensvurdering';
  atferd: Karakterverdi;
  /**
   * Ordensvurdering
   * Relations
   */
  elevforhold: Elevforhold;
  elevvurdering: Elevvurdering;
  /** Inherited Attributes */
  kommentar: Scalars['String']['output'];
  orden: Karakterverdi;
  skolear?: Maybe<Skolear>;
  /** Ordensvurdering */
  systemId: Identifikator;
  /** Ordensvurdering */
  vurderingsdato: Scalars['Date']['output'];
};

export type Undervisningsforhold = {
  __typename?: 'Undervisningsforhold';
  /**
   * Utdanningsforhold
   * Relations
   */
  arbeidsforhold: Arbeidsforhold;
  basisgruppe?: Maybe<Array<Maybe<Basisgruppe>>>;
  /** Inherited Attributes */
  beskrivelse: Scalars['String']['output'];
  eksamensgruppe?: Maybe<Array<Maybe<Eksamensgruppe>>>;
  /** Attributes */
  hovedskole?: Maybe<Scalars['Boolean']['output']>;
  kontaktlarergruppe?: Maybe<Array<Maybe<Kontaktlarergruppe>>>;
  medlemskap?: Maybe<Array<Maybe<Medlemskap>>>;
  skole: Skole;
  skoleressurs: Skoleressurs;
  /** Utdanningsforhold */
  systemId: Identifikator;
  time?: Maybe<Array<Maybe<Time>>>;
  undervisningsgruppe?: Maybe<Array<Maybe<Undervisningsgruppe>>>;
};

export type Undervisningsgruppe = {
  __typename?: 'Undervisningsgruppe';
  /** Inherited Attributes */
  beskrivelse: Scalars['String']['output'];
  /**
   * Gruppe
   * Relations
   */
  elevforhold?: Maybe<Array<Maybe<Elevforhold>>>;
  fag: Array<Maybe<Fag>>;
  grepreferanse?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  gruppemedlemskap?: Maybe<Array<Maybe<Undervisningsgruppemedlemskap>>>;
  medlemskap?: Maybe<Array<Maybe<Medlemskap>>>;
  /** Gruppe */
  navn: Scalars['String']['output'];
  /** Gruppe */
  periode: Array<Maybe<Periode>>;
  skole: Skole;
  skolear?: Maybe<Skolear>;
  /** Gruppe */
  systemId: Identifikator;
  termin?: Maybe<Array<Maybe<Termin>>>;
  time?: Maybe<Array<Maybe<Time>>>;
  undervisningsforhold?: Maybe<Array<Maybe<Undervisningsforhold>>>;
  vigoreferanse?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
};

export type Undervisningsgruppemedlemskap = {
  __typename?: 'Undervisningsgruppemedlemskap';
  /**
   * Gruppemedlemskap
   * Relations
   */
  elevforhold: Elevforhold;
  /** Inherited Attributes */
  gyldighetsperiode?: Maybe<Periode>;
  /** Gruppemedlemskap */
  systemId: Identifikator;
  undervisningsgruppe: Undervisningsgruppe;
};

export type Utdanningsprogram = {
  __typename?: 'Utdanningsprogram';
  /** Inherited Attributes */
  beskrivelse: Scalars['String']['output'];
  grepreferanse?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  medlemskap?: Maybe<Array<Maybe<Medlemskap>>>;
  /** Gruppe */
  navn: Scalars['String']['output'];
  /** Gruppe */
  periode: Array<Maybe<Periode>>;
  programomrade?: Maybe<Array<Maybe<Programomrade>>>;
  /**
   * Gruppe
   * Relations
   */
  skole?: Maybe<Array<Maybe<Skole>>>;
  /** Gruppe */
  systemId: Identifikator;
  vigoreferanse?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
};

export type Variabellonn = {
  __typename?: 'Variabellonn';
  /** Attributes */
  antall: Scalars['Long']['output'];
  anviser?: Maybe<Personalressurs>;
  /** Inherited Attributes */
  anvist?: Maybe<Scalars['Date']['output']>;
  arbeidsforhold: Arbeidsforhold;
  attestant?: Maybe<Personalressurs>;
  /** Lonn */
  attestert?: Maybe<Scalars['Date']['output']>;
  belop?: Maybe<Scalars['Long']['output']>;
  /** Lonn */
  beskrivelse: Scalars['String']['output'];
  /** Lonn */
  kildesystemId?: Maybe<Identifikator>;
  konterer?: Maybe<Personalressurs>;
  /** Lonn */
  kontert?: Maybe<Scalars['Date']['output']>;
  /** Lonn */
  kontostreng: Kontostreng;
  /**
   * Lonn
   * Relations
   */
  lonnsart: Lonnsart;
  /** Lonn */
  opptjent?: Maybe<Periode>;
  /** Lonn */
  periode: Periode;
  /** Lonn */
  systemId?: Maybe<Identifikator>;
};

export type Varsel = {
  __typename?: 'Varsel';
  faggruppemedlemskap: Faggruppemedlemskap;
  /** Attributes */
  fravarsprosent: Scalars['Long']['output'];
  karakteransvarlig?: Maybe<Undervisningsforhold>;
  sendt: Scalars['Date']['output'];
  systemId: Identifikator;
  tekst: Scalars['String']['output'];
  type?: Maybe<Varseltype>;
  /** Relations */
  utsteder?: Maybe<Skoleressurs>;
};

export type Varseltype = {
  __typename?: 'Varseltype';
  /** Inherited Attributes */
  gyldighetsperiode?: Maybe<Periode>;
  /** Begrep */
  kode: Scalars['String']['output'];
  /** Begrep */
  navn: Scalars['String']['output'];
  /** Begrep */
  passiv?: Maybe<Scalars['Boolean']['output']>;
  /** Begrep */
  systemId: Identifikator;
};

export type Virksomhet = {
  __typename?: 'Virksomhet';
  /** Inherited Attributes */
  forretningsadresse?: Maybe<Adresse>;
  /** Enhet */
  kontaktinformasjon?: Maybe<Kontaktinformasjon>;
  /**
   * Aktor
   * Relations
   */
  larling?: Maybe<Array<Maybe<Larling>>>;
  /** Enhet */
  organisasjonsnavn?: Maybe<Scalars['String']['output']>;
  /** Enhet */
  organisasjonsnummer?: Maybe<Identifikator>;
  /** Aktor */
  postadresse?: Maybe<Adresse>;
  /** Attributes */
  virksomhetsId: Identifikator;
};

export type Vitnemalsmerknad = {
  __typename?: 'Vitnemalsmerknad';
  /** Inherited Attributes */
  gyldighetsperiode?: Maybe<Periode>;
  /** Begrep */
  kode: Scalars['String']['output'];
  /** Begrep */
  navn: Scalars['String']['output'];
  /** Begrep */
  passiv?: Maybe<Scalars['Boolean']['output']>;
  /** Begrep */
  systemId: Identifikator;
};

export type Vurdering = {
  __typename?: 'Vurdering';
  eksamensgruppe?: Maybe<Eksamensgruppe>;
  /** Relations */
  elevforhold?: Maybe<Elevforhold>;
  /** Attributes */
  endelig: Scalars['Boolean']['output'];
  fag?: Maybe<Fag>;
  karakter: Karakterverdi;
  kommentar: Scalars['String']['output'];
  systemId: Identifikator;
  undervisningsgruppe?: Maybe<Undervisningsgruppe>;
};
