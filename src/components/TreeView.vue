<template>
  <div
    v-if="Object.keys(data).length === 0"
    class="section-title"
  >
    <div v-if="prefix">
      <span
        v-for="a in `${prefix ? prefix + '.':''}`?.split('.')?.length-2"
        :key="a"
        class="tree"
      >┃</span>

      <em class="empty">(empty)</em>
    </div>
  </div>
  <div
    v-for="(value, key, i) in data"
    :key="key"
    @click.stop="isObject(value) ? undefined : navigate(`${prefix ? prefix + '.':''}${key}`)"
  >
    <div
      :data-active="!!isOpen[`${prefix ? prefix + '.' : ''}${key}`]"
      :data-path="`${prefix ? prefix + '.' : ''}${key}`"
      :class="{active: !isObject(value) && selected === `${prefix ? prefix + '.':''}${key}`, missing: missingTranslations.find(mt => mt.startsWith(`${prefix ? prefix + '.':''}${key}`))}"
      class="section-title"
      @click="isObject(value) ? toggleOpen(`${prefix ? prefix + '.':''}${key}`) : undefined"
      @contextmenu="onRightClick($event,`${prefix ? prefix + '.':''}${key}`, isObject(value))"
    >
      <div>
        <template v-if="prefix">
          <span
            v-for="a in `${prefix ? prefix + '.':''}${key}`.split('.').length - 2"
            :key="a"
            class="tree"
          >┃</span>
          <span class="tree">{{ Object.keys(data).length - 1 === i && !isOpen[`${prefix ? prefix + '.':''}${key}`]? '┗' : '┣' }}</span>
        </template>
        &nbsp;
        <strong v-if="isObject(value)">{{ key }}</strong><em v-else>{{ key }}</em>
      </div>
      <div
        v-if="isObject(value)"
        class="indicator"
      >
        {{ isOpen[`${prefix ? prefix + '.' : ''}${key}`] ? '-' : '+' }}
      </div>
    </div>
    <tree-view
      v-if="isObject(value) && isOpen[`${prefix ? prefix + '.':''}${key}`]"
      :missing-translations="missingTranslations"
      :data="value"
      :selected="selected"
      :prefix="`${prefix?prefix+'.':''}${key}`"
      @path="p => emit('path', p)"
      @right-click="(...args) => emit('rightClick', ...args)"
    />
  </div>
</template>

<script setup lang="ts">
import { PrimeIcons } from '@primevue/core/api';
import { ref } from 'vue';

defineProps<{
  prefix?: string
  data: ObjectConstructor
  selected: string,
  missingTranslations: string[]
}>()

const isOpen = ref<Record<string, boolean>>({})

const toggleOpen = (key: string) => {
  console.log(key);
  isOpen.value[key] = !isOpen.value[key]
}

const emit = defineEmits(['path','rightClick'])

const isObject = (value: unknown) => {
  return typeof value === 'object' && value !== null;
}

const navigate = (key: string) => {
  emit('path', key)
}

const onRightClick = (e: PointerEvent, key: string, showAdd: boolean) => {
  emit('rightClick', e, [
    ...(showAdd ? [{ label: 'Add here', icon: PrimeIcons.PLUS }] : []),
    { label: 'Detele', icon: PrimeIcons.TRASH }
  ], key)
}
</script>

<style scoped lang="scss">
.indicator {
  position: sticky;
  right: 0;
}

.section-title {
  display: flex;
  justify-content: space-between;
  min-width: 200px;
  cursor: pointer;
  text-wrap: nowrap;
  &:hover {
    background-color: rgba(255, 255, 255, 0.09);
  }
  &:has(.empty) {
    pointer-events: none;
  }
  &.active {
    outline: thin solid;
  }
}

ul {
  padding-left: 0;
  text-align: left;
  list-style-type: none;
  margin: 0;
}

ul ul {
  padding-left: 20px;
}

.tree {
  color: #5b5b5b;
  line-height: 10px;
  font-size: 27px;
}
.empty {
  padding-left: 20px;
  opacity: 0.3;
}
</style>
