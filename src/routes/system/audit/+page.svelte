<script lang="ts">
  import { apiFetch } from "$lib/api-fetch/api-fetch"
  import AsyncButton from "$lib/components/AsyncButton.svelte"
  import type { AuditEntry, AuditEntryResourceDisplayNameEntry, AuditSearchQueryResult, AuditSearchTerms } from "$lib/types/db/shared-types"
  import { AUDIT_ENTRY_ACTION_DISPLAY_NAMES, AUDIT_ENTRY_RESOURCE_DISPLAY_NAMES } from "$lib/utils/audit-constants"
  import { getDateDaysBack, getDateValue, prettifyDateTime } from "$lib/utils/dates"
  import type { PageProps } from "./$types"

  type DisabledSearch = {
    disabled: boolean
    disabledMessage?: string
  }

  const auditActionDisplayNameEntries: [string, string][] = Object.entries(AUDIT_ENTRY_ACTION_DISPLAY_NAMES).sort((a: [string, string], b: [string, string]) => a[1].localeCompare(b[1]))
  const auditResourceDisplayNameEntries: [string, AuditEntryResourceDisplayNameEntry][] = Object.entries(AUDIT_ENTRY_RESOURCE_DISPLAY_NAMES).sort(
    (a: [string, AuditEntryResourceDisplayNameEntry], b: [string, AuditEntryResourceDisplayNameEntry]) => a[1].plural.localeCompare(b[1].plural)
  )

  let { data }: PageProps = $props()

  let auditEntries: AuditEntry[] = $derived(data.audits)
  let auditSearchError: string | undefined = $state(undefined)

  const timeFrameFromInitial: string = getDateValue(getDateDaysBack(7))
  const timeFrameToInitial: string = getDateValue(new Date())

  let searchTerms: AuditSearchTerms = $state({
    timeFrame: {
      from: timeFrameFromInitial,
      to: timeFrameToInitial
    },
    user: "",
    action: "",
    resource: ""
  })

  let isDisabled: DisabledSearch = $derived.by(() => {
    const timeFrameFrom: number = new Date(searchTerms.timeFrame.from).getTime()
    const timeFrameTo: number = new Date(searchTerms.timeFrame.to).getTime()
    if (Number.isNaN(timeFrameFrom) || Number.isNaN(timeFrameTo)) {
      return {
        disabled: true,
        disabledMessage: "Ugyldig datoformat"
      }
    }

    if (timeFrameTo - timeFrameFrom < 0) {
      return {
        disabled: true,
        disabledMessage: "Til dato er tidligere enn fra dato"
      }
    }

    return {
      disabled: false
    }
  })

  const handleSearch = async (): Promise<void> => {
    const queriedAuditEntries: AuditSearchQueryResult = await apiFetch("/api/audit/query", {
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST",
      body: searchTerms
    })

    auditEntries = queriedAuditEntries.entries
    auditSearchError = queriedAuditEntries.errorMessage
  }

  const getStringifiedMetadata = (metaData: AuditEntry["metaData"]): string => {
    if (!metaData) {
      return ""
    }

    if (!metaData.data) {
      return JSON.stringify(metaData, null, 2)
    }

    try {
      const d = JSON.parse(metaData.data)
      return JSON.stringify(
        {
          ...metaData,
          data: d
        },
        null,
        2
      )
    } catch {
      return JSON.stringify(metaData, null, 2)
    }
  }
</script>

<div class="page-content">
  <h1 class="ds-heading" data-size="lg">Audit</h1>

  <p>
    Her kan du se hva som skjer i systemet, og hvem som gjør hva. Dette inkluderer blant annet opprettelse og redigering av notater, redigering av oppfølging og tilrettelegging, og endringer i systemadministrasjonen.
  </p>

  <div class="ds-card audit-search-container" data-variant="tinted" data-color="brand3">
    <details class="ds-details" data-variant="default">
      <summary>Som standard vises de siste 7 dagers aktivitet. Her kan du søke etter spesifikke handlinger, ressurser og/eller brukere, og avgrense tidsrommets søk</summary>
      <div>
        <div class="audit-search-wrapper">
          <ds-field class="ds-field">
            <label for="audit-from-search" class="ds-label" data-weight="medium">Fra</label>
            <input id="audit-from-search" class="ds-input" placeholder="Søk fra dato" type="date" bind:value={searchTerms.timeFrame.from} />
          </ds-field>
          <ds-field class="ds-field">
            <label for="audit-to-search" class="ds-label" data-weight="medium">Til</label>
            <input id="audit-to-search" class="ds-input" placeholder="Søk til dato" type="date" min={searchTerms.timeFrame.from} bind:value={searchTerms.timeFrame.to} />
          </ds-field>
    
          <ds-field class="ds-field">
            <label for="audit-user-search" class="ds-label" data-weight="medium">Bruker</label>
            <input id="audit-user-search" class="ds-input" placeholder="Søk etter bruker" type="text" bind:value={searchTerms.user} />
          </ds-field>
      
          <ds-field class="ds-field">
            <label for="audit-action-search" class="ds-label" data-weight="medium">Handling</label>
            <select id="audit-action-search" class="ds-input" bind:value={searchTerms.action}>
              <option value="" selected>Alle handlinger</option>
              {#each auditActionDisplayNameEntries as auditActionEntry}
                <option value={auditActionEntry[0]}>{auditActionEntry[1]}</option>
              {/each}
            </select>
          </ds-field>
      
          <ds-field class="ds-field">
            <label for="audit-resource-search" class="ds-label" data-weight="medium">Velg ressurs</label>
            <select id="audit-resource-search" class="ds-input" bind:value={searchTerms.resource}>
              <option value="" selected>Alle ressurser</option>
              {#each auditResourceDisplayNameEntries as auditResourceEntry}
                <option value={auditResourceEntry[0]}>{auditResourceEntry[1].plural}</option>
              {/each}
            </select>
          </ds-field>
        </div>
      </div>
      {#if isDisabled.disabled || auditSearchError}
        <div class="ds-alert audit-search-container-error" data-color="warning">
          {isDisabled.disabledMessage || auditSearchError}
        </div>
      {/if}
      <AsyncButton disabled={isDisabled.disabled} buttonText="Søk" iconName="search" onClick={handleSearch} />
    </details>
  </div>

  {#if auditEntries.length > 0}
    <table class="ds-table">
      <thead>
        <tr>
          <th>Dato</th>
          <th>Bruker</th>
          <th>Handling</th>
          <th>Ressurs</th>
          <th>RessursId</th>
        </tr>
      </thead>
      <tbody>
        {#each auditEntries as auditEntry}
          <tr>
            <td>{prettifyDateTime(auditEntry.created.at)}</td>
            <td>{auditEntry.created.by.fallbackName || auditEntry.created.by.entraUserId}</td>
            <td>{AUDIT_ENTRY_ACTION_DISPLAY_NAMES[auditEntry.action] || "Ukjent handling"}</td>
            <td>{AUDIT_ENTRY_RESOURCE_DISPLAY_NAMES[auditEntry.resource].single || AUDIT_ENTRY_RESOURCE_DISPLAY_NAMES[auditEntry.resource].plural || "Ukjent ressurs"}</td>
            <td>
              {#if auditEntry.metaData}
                <button data-popover="inline" popoverTarget={`resource-meta-data-${auditEntry._id}`}>
                  {auditEntry.resourceId || "N/A"}
                </button>
                <div class="ds-popover" id={`resource-meta-data-${auditEntry._id}`} popover="auto" data-placement="top" data-variant="default" data-color="neutral">
                  <h3>Metadata</h3>
                  <pre>{getStringifiedMetadata(auditEntry.metaData)}</pre>
                </div>
              {:else}
                {auditEntry.resourceId || "N/A"}
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {:else}
    <div>
      Ingen audit logs funnet med angitte søkekriterier
    </div>
  {/if}
</div>

<style>
  .audit-search-container {
    margin-bottom: var(--ds-size-4);
  }

  .audit-search-wrapper {
    display: flex;
    gap: var(--ds-size-4);
    margin-bottom: var(--ds-size-8);
    flex-wrap: wrap;
  }
  
  #audit-from-search, #audit-to-search {
    width: auto;
  }
  
  .audit-search-container-error {
    margin-bottom: var(--ds-size-8);
  }
  
  .ds-popover {
      max-width: inherit;
  }
</style>