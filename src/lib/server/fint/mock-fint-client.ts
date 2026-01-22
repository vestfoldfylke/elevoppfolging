import type { IFintClient } from "$lib/types/fint/fint-client";
import type {AppStudent, Teacher} from "$lib/types/student";
import type {Elev} from "$lib/types/fint-types";

export class MockFintClient implements IFintClient {
  async getStudents(): Promise<Elev[]> {
    return [
      {
        person: {
          navn: {
            fornavn: "Balle",
            mellomnavn: null,
            etternavn: "Klorin"
          },
          fodselsnummer: {
            identifikatorverdi: "01010101010"
          },
          elev: {
            elevnummer: {
              identifikatorverdi: "E98765"
            },
            systemId: {
              identifikatorverdi: "stu1"
            },
            feidenavn: {
              identifikatorverdi: "balle.klorin"
            },
            brukernavn: {
              identifikatorverdi: "balle.klorin"
            },
            elevforhold: [
              {
                beskrivelse: "Elevforhold 1",
                skole: {
                  navn: "VGS Example School",
                  skolenummer: {
                    identifikatorverdi: "12345678"
                  },
                  systemId: {
                    identifikatorverdi: "sch1"
                  },
                  basisgruppe: [
                    {
                      navn: "69A",
                      beskrivelse: "Klasse 69A",
                      systemId: {
                        identifikatorverdi: "si1"
                      },
                      undervisningsforhold: [
                        {
                          systemId: {
                            identifikatorverdi: "uf1"
                          },
                          beskrivelse: "Undervisningsforhold 1",
                          hovedskole: true,
                          kontaktlarergruppe: [
                            {
                              navn: "iuIijseihufsohg LÆRER",
                              skole: {
                                navn: "VGS Example School",
                              }
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              }
            ]
          }
        }
      }
    ]
    /*const teacher: Teacher = {
      _id: "kl1",
      feidenavn: "lar1",
      navn: "Lærer Lærersen"
    }

    const teachingRelation = {
      systemId: "uf1",
      larer: teacher
    }

    return [
      {
        _id: "1",
        elevforhold: [
          {
            _id: "ef1",
            kontaktlarere: [
              teacher
            ],
            klasser: [
              {
                beskrivelse: "69A",
                navn: "69A",
                systemId: "si1",
                undervisningsforhold: [
                  teachingRelation
                ]
              }
            ],
            skole: {
              _id: "sk1",
              hovedskole: true,
              navn: "Adult School for Adult Adults",
              skolenummer: "81549300"
            },
            skolenummer: "81549300",
            undervisningsgrupper: [
              {
                beskrivelse: "Gruppe 1",
                navn: "Gruppe 1",
                systemId: "ug1",
                undervisningsforhold: [
                  teachingRelation
                ]
              }
            ]
          }
        ],
        elevnummer: "E12345",
        fodselsnummer: "01010112345",
        navn: "Elev Elevsen"
      }
    ]*/
  }
  
  private generateStudent(): AppStudent {
    return {
      _id: "1",
      elevforhold: [],
      elevnummer: "E12345",
      fodselsnummer: "01010112345",
      navn: "Elev Elevsen"
    }
  }
}