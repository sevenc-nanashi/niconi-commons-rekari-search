<template>
  <p class="whitespace-pre-wrap wrap">
    {{ getDescription(props.licenseInfo) }}
  </p>
  <div class="mt-2 pt-2 border-t-[1px] border-slate-300">
    <p
      v-for="[key, value] in fields"
      :key="key"
      class="whitespace-pre-wrap wrap"
    >
      <span class="font-bold">{{ key }}：</span>{{ value }}
    </p>
  </div>
</template>

<script setup lang="ts">
import {
  ExternalDistribution,
  LicenseInfo,
} from "@workspace/common/dist/types";
import { getUploader, getDescription } from "../utils.ts";
import { computed } from "vue";

const props = defineProps<{
  licenseInfo: LicenseInfo;
}>();

const fields = computed(() => {
  const tryProp = <K extends keyof ExternalDistribution>(
    key: K,
  ): ExternalDistribution[K] | undefined => {
    return (
      props.licenseInfo.externalDistribution?.[key] ||
      props.licenseInfo.licenseOnly?.[key]
    );
  };
  const fields = {
    種別:
      [
        props.licenseInfo.externalDistribution && "外部配布",
        props.licenseInfo.nonCommons && "コモンズ外",
        props.licenseInfo.licenseOnly && "ライセンスのみ",
      ]
        .filter(Boolean)
        .join("、") || "（不明）",

    ID: props.licenseInfo.id,
    タイトル: props.licenseInfo.title,
    投稿者名: getUploader(props.licenseInfo),
    子作品数: props.licenseInfo.childrenCount,
    "ニコニ・コモンズで配布しているファイル": tryProp("filesInCommons"),
    カテゴリ: tryProp("category"),
    関連URL: tryProp("relatedUrl"),
    利用許可範囲: tryProp("usage"),
    ニコニコ投稿時の親子登録: tryProp("parentRegistration"),
    権利表記: tryProp("rights"),
    希望する権利表記: tryProp("preferredRights"),

    "動画配信サイトでの収益化（個人）": tryProp("personalMonetization"),
    "動画配信サイトでの収益化（法人）": tryProp("corporateMonetization"),
    "営利利用（個人）": tryProp("personalCommercialUse"),
    "営利利用（法人）": tryProp("corporateCommercialUse"),
    独自に定める条件: tryProp("customConditions"),
  };

  return Object.entries(fields).filter(([_, value]) => value !== undefined);
});
</script>
