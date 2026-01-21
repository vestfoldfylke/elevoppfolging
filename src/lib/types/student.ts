export type Larer = {
  _id: string;
  feidenavn: string;
  navn: string;
};

export type Undervisningsforhold = {
  systemId: string;
  larer: Larer;
};

export type Klasse = {
  systemId: string;
  navn: string;
  beskrivelse: string;
  undervisningsforhold: Undervisningsforhold[];
};

export type Undervisningsgruppe = {
  systemId: string;
  navn: string;
  beskrivelse: string;
  undervisningsforhold: Undervisningsforhold[];
};

export type Skole = {
  _id: string;
  skolenummer: string;
  navn: string;
}

export type Elevforhold = {
  _id: string;
  skole: Skole & {
    hovedskole: boolean;
  };
  skolenummer: string;
  undervisningsgrupper: Undervisningsgruppe[];
  klasser: Klasse[];
  kontaktlarere: Larer[];
}

export type Elev = {
  _id: string;
  navn: string;
  elevnummer: string;
  fodselsnummer: string;
  elevforhold: Elevforhold[];
};