<script setup lang="ts">
import Toast from 'primevue/toast';
import TreeView from './components/TreeView.vue';
import { computed, onMounted, ref } from 'vue';
import Button from 'primevue/button'
import Splitter from 'primevue/splitter'
import SplitterPanel from 'primevue/splitterpanel'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import InputText from 'primevue/inputtext'
import Dialog from 'primevue/dialog'
import _ from 'lodash'
import ContextMenu from 'primevue/contextmenu';
import { PrimeIcons } from '@primevue/core/api';
import { useToast } from "primevue/usetoast";
import { getObjectDiffPathsSync, sortObjectDeeply } from './utils';


const jsonData = ref({})
const ctxmenu = ref()
const ctxitems = ref<any[]>([])
const path = ref('')
const dialogOpen = ref(false)

const currentValues = ref({})
const tabs = ref([])
const newKey = ref('')
const xxxx = ref<string[]>([])
const toast = useToast();

const showWarn = () => {
  toast.add({ severity: 'warn', summary: 'Warning', detail: 'Message key already exist!', life: 3000 });
};
const showDeleted = () => {
  toast.add({ severity: 'error', summary: 'Deleted', detail: 'Message key deleted', life: 3000 });
};

const menu = computed(() => {
  return jsonData.value?.['en'] ? jsonData.value?.['en'] : {};
})

onMounted(async () => {
  const dirs = await window.ipcRenderer.invoke('find-locales-dirs')
  console.log(dirs);
  const root = dirs.selectedDir
  const paths = dirs.localesDirs as string[]
  tabs.value = paths.map(path => ({
    title: path.replace(root, '.'),
    value: path
  }))
  jsonData.value = await window.ipcRenderer.invoke('read-dir', paths[0])
})

const onPathChanged = (p: string) => {
  path.value = p
  Object.keys(jsonData.value).forEach(lang => {
    currentValues.value[lang] = _.get(jsonData.value, lang + '.' + p)
  })

}

async function save(p?: string) {
  console.log(path.value);
  if (p) {
    Object.keys(jsonData.value).forEach(lang => {
      _.set(jsonData.value, lang + '.' + (p), currentValues.value[lang] ?? '')
    })
  }
  sortObjectDeeply(jsonData.value)
  const result = await window.ipcRenderer.invoke('save-changes', JSON.stringify(jsonData.value))
}

async function getTranslation(text, target)  {
  const result = await window.ipcRenderer.invoke('translate', JSON.stringify({ text, target }))
  currentValues.value[target] = result.text
}

const copy = () => {
  if(path.value) {
    window.ipcRenderer.invoke('clipboard', path.value)
    toast.add({ severity: 'success', summary: 'Copied!', detail: 'Path was successfully copied to clipboard', life: 3000 });
  }
}

function getPathSegments(path: string) {
  const segments = _.split(path, '.');
  return _.map(segments, (segment, index) => _.join(_.slice(segments, 0, index + 1), '.'));
}

const addNewKey = () => {
  if (_.has(menu.value, newKey.value)) {

    showWarn()
  } else {
    currentValues.value = {}
    save(newKey.value)
  }
  path.value = newKey.value;
  getPathSegments(newKey.value).map(p => {
    setTimeout(() => {
      const target = document.querySelector(`[data-path="${p}"][data-active="false"]`)
      if (target) {
        target.click()
        target.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100)
  })
  dialogOpen.value = false
}

const rightClick= (e: PointerEvent, items: any[], key: string) => {
  console.log(items, key);
  ctxitems.value = items.map(item => {
    if (item.icon === PrimeIcons.PLUS) {
      item.command = () => {
        newKey.value = key+'.'
        dialogOpen.value = true
      }
    }
    if (item.icon === PrimeIcons.TRASH) {
      path.value = ''
      item.command = () => {
        const a = JSON.parse(JSON.stringify(jsonData.value))
        Object.keys(a).forEach(lang => {
          _.unset(a, lang + '.' + key)
        })
        jsonData.value = a
        save()
        showDeleted()
      }
    }
    return item
  });
  ctxmenu.value.show(e)
}

const missingKeys = computed(() => {
  return Object.keys(jsonData.value).flatMap(
    lang => {
      return getObjectDiffPathsSync(jsonData.value['en'], jsonData.value[lang])
    }
  )
})

const changePath = (path: string) => {
  save().then(async () => {
    jsonData.value = await window.ipcRenderer.invoke('read-dir', path)
  })
}


</script>

<template>
  <Tabs :value="0" scrollable>
    <TabList>
      <Tab v-for="(tab, index) in tabs" :key="tab.value" :value="index" @click="() => changePath(tab.value)">
        {{ tab.title }}
      </Tab>
    </TabList>
  </Tabs>
  <Splitter class="window" unstyled>
    <Toast />
    <SplitterPanel :size="25" :minSize="10">
      <div class="sidebar">
        <div>
          <TreeView
            :missing-translations="missingKeys"
            :selected="path"
            :data="menu"
            @path="onPathChanged"
            @right-click="rightClick"
          />
        </div>
        <Button
          severity="secondary"
          class="add"
          @click="dialogOpen = true"
        >
          Add translation
        </Button>
      </div>
    </SplitterPanel>
    <SplitterPanel :size="75">
      <div
        v-if="path"
        class="editor"
      >
        <div
          v-for="key in Object.keys(jsonData)"
          :key="key"
          class="lang-wrapper"
        >
          <div>{{ key }}</div>
          <div class="input-wrapper">
            <input
              :name="key"
              :value="currentValues[key]"
              @input="val => currentValues[key] = val.target.value"
            >
            <Button severity="secondary" v-if="currentValues?.en && key !== 'en'" @click="getTranslation(currentValues['en'], key)">Translate</Button>
          </div>
        </div>
        <Button
          severity="secondary"
          class="save"
          @click="save(path)"
        >
          Save
        </Button>
      </div>
    </SplitterPanel>
  </Splitter>


    <ContextMenu
      ref="ctxmenu"
      :model="ctxitems"
    />


  <div
    class="path-wrapper"

  >
    <div @click="copy">{{ path }}</div>
  </div>

  <Dialog
    v-model:visible="dialogOpen"
    modal
    header="Add translation key"
    :style="{ width: '25rem' }"
    @hide="newKey = ''"
  >
    <div
      class="flex items-center gap-4 mb-4"
      style="width: 100%"
    >
      <InputText
        autofocus
        v-model="newKey"
        style="width: 100%"
        autocomplete="off"
        @keyup.enter="() => {
          !!newKey && addNewKey()
        }"
      />
    </div>
    <div class="flex justify-end gap-2">
      <Button
        style="width: 100%; margin-top: 20px"
        type="button"
        label="Save"
        severity="secondary"
        @click="addNewKey"
      />
    </div>
  </Dialog>
</template>

<style scoped lang="scss">
$tabsHeight: 47px;
$pathHeight: 30px;
.window {
  display: flex;
}

.editor {
  flex-grow: 1;
  height: calc(100vh - $pathHeight - $tabsHeight);
  overflow: auto;
}

.path-wrapper {
  height: $pathHeight;
  padding: 0 10px;
  outline: #555 thin solid;
  display: flex;
  > div:first-child {
    flex-grow: 1
  }
}

.sidebar {
  padding: 10px;
  height: calc(100vh - $pathHeight - $tabsHeight);
  width: 100%;
  overflow: auto;
  background-color: rgba(255, 255, 255, 0.06);
}

.lang-wrapper {
  margin: 10px;
  padding: 10px;
  border: solid thin rgba(255, 255, 255, 0.06);
  input {
    width: calc(100% - 10px);
  }
}
button {
  font-size: 12px;
  position:sticky;
  bottom: 0;
}
button.add {
  width: 100%;
  margin-top: 20px;
}
button.save {
  margin: 10px;
  width: calc(100% - 20px);
}

.input-wrapper {
  display: flex;
}

</style>
