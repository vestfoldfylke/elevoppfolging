<script lang="ts">
  import PageHeader from "$lib/components/PageHeader.svelte"
  import { STUDENT_CHECKBOX_DISPLAY_NAMES } from "$lib/utils/student-checkbox-constants"
</script>

<div class="page-content">
  <PageHeader title="Konfigurasjon" />
  <a href={`/system/configuration/studentcheckboxes`}>Konfigurasjon av {STUDENT_CHECKBOX_DISPLAY_NAMES.FOLLOW_UP.single?.toLowerCase() || STUDENT_CHECKBOX_DISPLAY_NAMES.FOLLOW_UP.plural.toLowerCase()}/{STUDENT_CHECKBOX_DISPLAY_NAMES.FACILITATION.plural.toLowerCase()}-sjekkbokser (K.A.O.S)</a>
</div>

<style>
</style>
