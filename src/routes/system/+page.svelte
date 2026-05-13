<script lang="ts">
  import { STUDENT_CHECKBOX_DISPLAY_NAMES } from "$lib/utils/student-checkbox-constants"

  const followUpDisplayName: string = STUDENT_CHECKBOX_DISPLAY_NAMES.FOLLOW_UP.single || STUDENT_CHECKBOX_DISPLAY_NAMES.FOLLOW_UP.plural
  const followUpDisplayNameLowerCase: string = followUpDisplayName.toLowerCase()
  const facilitationDisplayName: string = STUDENT_CHECKBOX_DISPLAY_NAMES.FACILITATION.plural
  const facilitationDisplayNameLowerCase: string = facilitationDisplayName.toLowerCase()
</script>

<div class="page-content">
  <h1 class="ds-heading" data-size="lg">Systemadministrasjon</h1>
  <div class="ds-card" data-variant="default" data-color="neutral">
    <div class="ds-card__block">
      <h2 class="ds-heading">
        <a class="ds-link" href="/system/schools">Skoler</a>
      </h2>
      <p class="ds-paragraph" data-variant="default">
        Her kan du redigere skoleleder-tilgang, og legge til eller fjerne manuelle skoler.
      </p>
    </div>
  </div>
  <div class="ds-card" data-variant="default" data-color="neutral">
    <div class="ds-card__block">
      <h2 class="ds-heading">
        <a class="ds-link" href="/system/templates">Notatmaler</a>
      </h2>
      <p class="ds-paragraph" data-variant="default">
        Her kan du se og redigere notatmaler som kan brukes når du oppretter notater om elever og klasser.
      </p>
    </div>
  </div>
  <div class="ds-card" data-variant="default" data-color="neutral">
    <div class="ds-card__block">
      <h2 class="ds-heading">
        <a class="ds-link" href="/system/configuration/studentcheckboxes">{followUpDisplayName} og {facilitationDisplayName}</a>
      </h2>
      <p class="ds-paragraph" data-variant="default">
        Her kan du se og redigere hvilke {STUDENT_CHECKBOX_DISPLAY_NAMES.FOLLOW_UP.plural.toLowerCase()} og {facilitationDisplayNameLowerCase} som skal være tilgjengelige for lærere å krysse av på elevkortet, og som kan brukes i sortering på elevoversikten.
      </p>
    </div>
  </div>
  <div class="ds-card" data-variant="default" data-color="neutral">
    <div class="ds-card__block">
      <h2 class="ds-heading">
        <a class="ds-link" href="/system/audit">Audit</a>
      </h2>
      <p class="ds-paragraph" data-variant="default">
        Her kan du se hva som skjer i systemet, og hvem som gjør hva. Dette inkluderer blant opprettelse og redigering av notater, redigering av {followUpDisplayNameLowerCase} og {facilitationDisplayNameLowerCase}, og endringer i systemadministrasjonen.
      </p>
    </div>
  </div>
</div>

<style>
  .ds-card {
    margin: var(--ds-size-4) 0;
  }
</style>
