<script setup>
const { t } = useI18n()
const { fee, tiers } = useMessengerCod()
</script>

<template>
  <div class="messenger-cod">
    <div class="messenger-cod__desc">{{ t('payments.messenger_cod.desc') }}</div>

    <div v-if="fee" class="messenger-cod__fee">
      <span class="messenger-cod__fee-label">{{ t('payments.messenger_cod.fee_label') }}</span>
      <simple-price :value="fee.amount" :currency-code="fee.currency" class="messenger-cod__fee-value" />
    </div>

    <ul v-if="tiers.length" class="messenger-cod__tiers">
      <li v-for="tier in tiers" :key="tier.maxAmount" class="messenger-cod__tier">
        <span>{{ t('payments.messenger_cod.up_to') }}</span>
        <simple-price :value="tier.maxAmount" :currency-code="tier.fee?.currency" />
        <span>—</span>
        <simple-price v-if="tier.fee" :value="tier.fee.amount" :currency-code="tier.fee.currency" />
      </li>
    </ul>
  </div>
</template>

<style lang="scss" scoped>
.messenger-cod {
  display: flex;
  flex-direction: column;
  gap: 8px;

  &__fee {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
  }

  &__tiers {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 14px;
    opacity: 0.8;
  }

  &__tier {
    display: flex;
    align-items: center;
    gap: 4px;
  }
}
</style>
