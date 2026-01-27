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

export type FintElev = {
  systemId: {
    identifikatorverdi: string
  },
  feidenavn?: {
    identifikatorverdi: string
  } | null,
  elevnummer?: {
    identifikatorverdi: string
  } | null,
  person: {
    fodselsnummer: {
      identifikatorverdi: string
    },
    navn: {
      fornavn: string,
      mellomnavn?: string | null,
      etternavn: string
    }
  }
};

export type FintGyldighetsPeriode = {
  start: string,
  slutt?: string | null
};

export type FintProgramomrademedlemskap = {
  gyldighetsperiode?: FintGyldighetsPeriode | null,
  programomrade: {
    navn: string,
    grepreferanse?: Array<string | null> | null,
    systemId: {
      identifikatorverdi: string
    },
    utdanningsprogram: Array<{
      navn: string,
      grepreferanse?: Array<string | null> | null,
      systemId: {
        identifikatorverdi: string
      }
    } | null>
  }
};

export type FintUndervisningsforhold = {
  skoleressurs: {
    systemId: {
      identifikatorverdi: string
    },
    feidenavn?: {
      identifikatorverdi: string
    } | null,
    person?: {
      navn: {
        fornavn: string,
        mellomnavn?: string | null,
        etternavn: string
      }
    } | null
  }
};

export type FintKlassemedlemskap = {
  gyldighetsperiode?: FintGyldighetsPeriode | null,
  klasse: {
    navn: string,
    systemId: {
      identifikatorverdi: string
    },
    trinn: {
      navn: string,
      grepreferanse?: Array<string | null> | null
    },
    undervisningsforhold?: Array<FintUndervisningsforhold | null> | null
  }
};

export type FintUndervisningsgruppemedlemskap = {
  systemId: {
    identifikatorverdi: string
  },
  gyldighetsperiode?: FintGyldighetsPeriode | null,
  undervisningsgruppe: {
    navn: string,
    systemId: {
      identifikatorverdi: string
    },
    undervisningsforhold?: Array<FintUndervisningsforhold | null> | null
  }
};

export type FintKontaktlarergruppemedlemskap = {
  systemId: {
    identifikatorverdi: string
  },
  gyldighetsperiode?: FintGyldighetsPeriode | null,
  kontaktlarergruppe: {
    navn: string,
    systemId: {
      identifikatorverdi: string
    },
    undervisningsforhold?: Array<FintUndervisningsforhold | null> | null
  }
};

export type FintElevforhold = {
  hovedskole?: boolean | null,
  systemId: {
    identifikatorverdi: string
  },
  gyldighetsperiode?: {
    start: string,
    slutt?: string | null
  } | null,
  elev: FintElev,
  programomrademedlemskap?: Array<FintProgramomrademedlemskap | null> | null,
  klassemedlemskap?: Array<FintKlassemedlemskap | null> | null,
  undervisningsgruppemedlemskap?: Array<FintUndervisningsgruppemedlemskap | null> | null,
  kontaktlarergruppemedlemskap?: Array<FintKontaktlarergruppemedlemskap | null> | null
};

export type FintSkole = {
  navn: string,
  skolenummer: {
    identifikatorverdi: string
  },
  elevforhold?: Array<FintElevforhold | null> | null
};

export type FintSchoolWithStudentsVariables = Exact<{
  schoolNumber: Scalars['String']['input'];
}>;


export type FintSchoolWithStudents = {
  skole?: FintSkole | null
};
