<template>
  <main class="flex flex-col gap-2">
    <h1>ニコニ・コモンズ（Re：仮）サーチ</h1>
    <p>
      <a href="https://static.commons.nicovideo.jp/"
        >ニコニ・コモンズ（Re：仮）</a
      >の素材を検索する<span class="font-bold">非公式の</span>サイトです。<br />
      データは自分のサーバーにキャッシュしているため、ニコニコ側のサーバーに負荷をかけることはありません。<br />
    </p>
    <p class="mt-2 text-sm">
      開発者：<a href="https://sevenc7c.com">名無し｡</a> | ソースコード：
      <a href="https://github.com/sevenc-nanashi/niconi-commons-rekari-search"
        >sevenc-nanashi/niconi-commons-rekari-search</a
      >
    </p>

    <form class="border-slate-300 border-t-[1px] pt-4 mt-2 relative">
      <fieldset :disabled="isSearching">
        <div
          class="grid absolute top-0 right-0 w-full h-full bg-white z-50 transition-opacity duration-300 cursor-wait"
          :style="{
            opacity: isSearching ? 0.5 : 0,
            pointerEvents: isSearching ? 'auto' : 'none',
          }"
        />
        <div class="grid grid-cols-[12rem_1fr] gap-2">
          <ElInput placeholder="ID" v-model="idQuery" />
          <ElInput placeholder="タイトル" v-model="titleQuery" />
        </div>
        <div>
          <ElCheckbox
            v-model="includeExternalDistribution"
            label="外部サイトで素材配布しているライセンス"
          />
          <p class="type-description description wrap">
            『ゆっくりMovieMaker』や『VOICEVOX』といったツールのライセンス・配布場所や、一部の立ち絵素材やボカロ曲素材のダウンロードURL・ダウンロードパスワードなどが含まれます。<br />
            一部、素材配布等はおこなわず、利用条件のみ提示されているライセンスといったコンテンツの情報も含まれます。（例：『World
            of Tanks』や『ドラゴンクエストX』など）
          </p>
        </div>

        <div>
          <ElCheckbox
            v-model="includeNonCommons"
            label="二次創作（子作品）がある ニコニコ動画・ニコニコ静画などの説明文"
          />
          <p class="type-description description wrap">
            ニコニコ動画やニコニコ静画などに投稿されていた、MMD素材や立ち絵素材のダウンロードURL・ダウンロードパスワードなどをご覧いただけます。<br />
            二次創作（子作品）があり、説明文にURLが含まれているニコニコ動画・ニコニコ静画などのタイトル・説明文を機械的に抽出したものです。データに含まれるコンテンツすべてが必ずしも投稿者により二次創作の公認をされているわけではないことにご留意ください。説明文をよくご覧になった上でご活用ください。<br />
            データが膨大であるため、子作品数の多い上位30,000件の情報提供とさせていただいています。
          </p>
        </div>
        <div>
          <ElCheckbox
            v-model="includeLicenseOnly"
            label="ニコニ・コモンズで素材配布しているライセンス"
          />
          <p class="type-description description wrap">
            データが膨大であるため、子作品数の多い上位30,000件の情報提供とさせていただいています。
          </p>
        </div>

        <ElButton class="mt-4 w-full" type="primary" @click="search">
          検索
        </ElButton>
      </fieldset>
    </form>
    <div v-if="searchResult" class="mt-4 border-slate-300 border-t-[1px] pt-4">
      <p v-if="searchResult === 'error'" class="text-red-500">
        エラーが発生しました。
      </p>
      <template v-else>
        <p v-if="licenseCount === 0">何も見つかりませんでした。</p>
        <p v-if="licenseCount > 0">検索結果：{{ licenseCount }}件</p>
        <div
          v-if="licenseCount > 0"
          class="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2"
        >
          <ElCard
            v-for="licenseInfo in licenseInfos"
            :key="licenseInfo.id"
            shadow="hover"
            class="cursor-pointer h-[400px] relative"
            @click="verboseView(licenseInfo)"
          >
            <template #header>
              <div class="w-full relative">
                <a
                  v-if="licenseInfo.licenseOnly"
                  class="font-bold text-blue-500 hover:underline"
                  :href="`https://static.commons.nicovideo.jp/works/${licenseInfo.id}`"
                  target="_blank"
                  @click.stop
                >
                  {{ licenseInfo.title }}
                </a>
                <p v-else class="font-bold">
                  {{ licenseInfo.title }}
                </p>
                <p>
                  {{ getUploader(licenseInfo) }}
                  <span class="opacity-75 monospace absolute right-0">
                    {{ licenseInfo.id }}
                  </span>
                </p>
              </div>
            </template>

            <p class="whitespace-pre-wrap text-sm description wrap">
              {{ getDescription(licenseInfo) }}
            </p>

            <div
              class="absolute bottom-0 right-0 w-full bg-gradient-to-b from-transparent to-white h-12"
            />
          </ElCard>
        </div>
      </template>
    </div>
    <ElDialog
      v-model="showCurrentVerboseView"
      :title="`詳細：${currentVerboseView && currentVerboseView.title}`"
    >
      <VerboseView
        v-if="currentVerboseView"
        :licenseInfo="currentVerboseView"
      />
    </ElDialog>
  </main>
</template>

<script setup lang="ts">
import { ElButton, ElCard, ElCheckbox, ElDialog, ElInput } from "element-plus";
import VerboseView from "./components/VerboseView.vue";
import { computed, ref } from "vue";
import urlcat from "urlcat";
import { LicenseInfo, SearchResponse } from "@workspace/common/dist/types";
import { getDescription, getUploader } from "./utils.ts";

const idQuery = ref("");
const titleQuery = ref("");
const includeExternalDistribution = ref(true);
const includeNonCommons = ref(true);
const includeLicenseOnly = ref(true);

const isSearching = ref(false);

const licenseCount = ref(0);
const licenseInfos = ref<LicenseInfo[]>([]);

const searchResult = ref<"ok" | "error" | null>(null);

const search = async () => {
  try {
    isSearching.value = true;
    searchResult.value = null;

    const response = await fetch(
      urlcat("/api/search", {
        id: idQuery.value,
        title: titleQuery.value,
        externalDistribution: includeExternalDistribution.value,
        nonCommons: includeNonCommons.value,
        licenseOnly: includeLicenseOnly.value,
        offset: 0,
      }),
    );

    if (!response.ok) {
      searchResult.value = "error";
      return;
    }

    const result: SearchResponse = await response.json();

    searchResult.value = "ok";
    licenseCount.value = result.count;
    licenseInfos.value = result.results;
  } finally {
    isSearching.value = false;
  }
};

const currentVerboseView = ref<LicenseInfo | null>(null);

const verboseView = (licenseInfo: LicenseInfo) => {
  currentVerboseView.value = licenseInfo;
};

const showCurrentVerboseView = computed({
  get: () => currentVerboseView.value !== null,
  set: (value) => {
    if (!value) {
      currentVerboseView.value = null;
    }
  },
});
</script>

<style lang="scss">
main {
  max-width: 800px;
}

.type-description {
  @apply text-xs text-gray-500;
}

.description {
  line-height: 1.5;
}
</style>
