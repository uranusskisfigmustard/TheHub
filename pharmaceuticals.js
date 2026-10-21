(() => {
  'use strict';
  // Curated player-facing clinic listing and recovery rules; retail prices/access come from the live catalog.
  window.HubPharmaceuticals = Object.freeze({
  "category": "PHARMACEUTICALS",
  "serviceListings": [
    {
      "catalogRow": 225,
      "category": "PHARMACEUTICALS",
      "item": "Hard Reset",
      "price": 1000,
      "priceLabel": "1,000cr per treatment",
      "mechanics": "After 12 hr supervised sleep, gain 2 additional levels of Advantage on one normally permitted weekly Rest Save; stacks with independent leisure. After waking: 24 hr bed rest/quiet domestic activity, then 24 hr Speed/Combat/Intellect Checks at Disadvantage. Counts as 1 Treatment Use; shared dependence rules apply. 1,000cr includes care; clinic appointment required.",
      "provider": "Saint Orra Community Clinic",
      "restricted": false,
      "canPurchase": false,
      "serviceOnly": true,
      "accessState": "clinic_appointment",
      "minimumAccess": "",
      "progressStanding": ""
    }
  ],
  "rules": [
    "Ordinary Recovery Aid can establish one leisure-related level of Advantage for a weekly Rest Save. A spa visit, another leisure activity and this aid do not each supply separate leisure bonuses.",
    "Choose Borrowed Peace OR Hard Reset for one pharmaceutical enhancement per normally permitted weekly Rest Save. It can stack with independently earned leisure and other approved sources. Extra doses or combinations provide no further bonus; no additional Rest Save or permanent Save improvement is granted.",
    "Borrowed Peace and Hard Reset each count as one Treatment Use when used. The first two treatments require no dependence check. Before the third and every subsequent treatment, make a Body Save against Dependence; the treatment's own bonus never applies to this Save. If it fails, Dependence begins, but the current treatment still works.",
    "If not dependent, fourteen consecutive days without either enhancement clear Treatment Uses. Switching between them does not reset the count. Ordinary recreation, routine prescribed care and Stimpaks are not automatically subject to this procedure.",
    "Once dependent, further doses suppress withdrawal but give no pharmaceutical Rest Save enhancement. Other independent recovery benefits still apply.",
    "Stopping starts withdrawal across the next two scheduled weekly Rest Saves: gain 2 Stress immediately before each and add one level of Disadvantage to each. Completing both periods without either enhancement clears Dependence and Treatment Uses. Resuming use interrupts that recovery. There are no extra daily withdrawal rolls.",
    "Side effects apply even if the Rest Save fails. Borrowed Peace's 2-Stress rebound cannot be postponed by another dose. Drug-specific overdose rules remain separate; extra doses do not purchase extra bonuses."
  ]
});
})();
