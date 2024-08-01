<template>
  <main class="flex flex-col gap-2">
    <h1>ニコニ・コモンズ（Re：仮）サーチ</h1>
    <video controls :src="explode" />
    <p>
      ニコニ・コモンズ（Re：仮）サーチはニコニ・コモンズの正式復旧に伴い、爆破されました。<br />
      ご利用いただき（そうかな...）、ありがとうございました。
    </p>
    <p class="mt-2 text-sm">
      開発者：<a href="https://sevenc7c.com">名無し｡</a> | ソースコード：
      <a href="https://github.com/sevenc-nanashi/niconi-commons-rekari-search"
        >sevenc-nanashi/niconi-commons-rekari-search</a
      >
    </p>
  </main>
</template>

<script setup>
import explode from "./explode.webm?url";
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
