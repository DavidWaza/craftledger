<script setup lang="ts">
const props = defineProps<{
  /** 12 values, minor units, positive = profit, negative = loss */
  series: number[]
  currency: string
}>()

const W = 560
const H = 180
const PAD = 8
const baseline = H / 2

const maxAbs = computed(() => Math.max(1, ...props.series.map(v => Math.abs(v))))

const bars = computed(() => {
  const bw = (W - PAD * 2) / 12
  return props.series.map((v, i) => {
    const h = (Math.abs(v) / maxAbs.value) * (H / 2 - 14)
    return {
      x: PAD + i * bw + bw * 0.18,
      width: bw * 0.64,
      y: v >= 0 ? baseline - h : baseline,
      height: Math.max(v === 0 ? 0 : 2, h),
      profit: v >= 0,
      value: v,
      month: MONTH_NAMES[i].slice(0, 1)
    }
  })
})
</script>

<template>
  <figure>
    <svg :viewBox="`0 0 ${W} ${H + 18}`" class="w-full" role="img" aria-label="Net result by month">
      <line :x1="PAD" :x2="W - PAD" :y1="baseline" :y2="baseline" stroke="#232730" stroke-width="1" />
      <g v-for="(b, i) in bars" :key="i">
        <rect
          v-if="b.value !== 0"
          :x="b.x" :y="b.y" :width="b.width" :height="b.height" rx="2"
          :fill="b.profit ? '#2F7A4D' : '#AE4438'"
        >
          <title>{{ MONTH_NAMES[i] }}: {{ formatMoney(b.value, currency) }}</title>
        </rect>
        <text
          :x="b.x + b.width / 2" :y="H + 14" text-anchor="middle"
          class="fill-faint" font-size="10" font-family="'Spline Sans Mono', monospace"
        >
          {{ b.month }}
        </text>
      </g>
    </svg>
    <figcaption class="mt-1 flex gap-4 text-xs text-faint">
      <span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-sm bg-moss" /> profit month</span>
      <span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-sm bg-clay" /> loss month</span>
    </figcaption>
  </figure>
</template>
