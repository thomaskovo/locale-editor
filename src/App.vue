<script setup lang="ts">
import Toast from 'primevue/toast';
import TreeView from './components/TreeView.vue';
import { computed, onMounted, ref } from 'vue';
import Button from 'primevue/button'
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
  jsonData.value = await window.ipcRenderer.invoke('read-dir')
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
  const MESSAGE = 'Path copied!'
  if(path.value && path.value != MESSAGE) {
    window.ipcRenderer.invoke('clipboard', path.value)
    const pathBak = path.value.toString();
    path.value = MESSAGE;
    setTimeout(() => {
      path.value = pathBak;
    }, 2000)
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

</script>

<template>
  <div class="window">
    <Toast />
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
      <button
        class="add"
        @click="dialogOpen = true"
      >
        Add translation
      </button>
    </div>
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
          <button v-if="currentValues?.en && key !== 'en'" @click="getTranslation(currentValues['en'], key)">Translate</button>
        </div>
      </div>
      <button
        class="save"
        @click="save(path)"
      >
        Save
      </button>
    </div>
    <ContextMenu
      ref="ctxmenu"
      :model="ctxitems"
    />
  </div>

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
        v-model="newKey"
        style="width: 100%"
        autocomplete="off"
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
$pathHeight: 30px;
.window {
  display: flex;
}

.editor {
  flex-grow: 1;
  height: calc(100vh - $pathHeight);
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
  height: calc(100vh - $pathHeight);
  width: 50%;
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
