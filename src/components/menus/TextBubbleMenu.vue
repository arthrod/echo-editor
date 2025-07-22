<script setup lang="ts">
import { computed, reactive, unref } from 'vue'
import type { NodeSelection } from '@tiptap/pm/state'
import { TextSelection } from '@tiptap/pm/state'
import { Separator } from '@/components/ui/separator'
import type { Editor, Extension } from '@tiptap/vue-3'
import { BubbleMenu } from '@tiptap/vue-3/menus'
import type { BaseKitOptions } from '@/extensions/BaseKit'
import type { BubbleTypeMenu } from './BasicBubble'
import { useLocale } from '@/locales'
import { useTiptapStore } from '@/hooks'
import { isCustomNodeSelected } from '@/utils/isCustomNodeSelected'
import { isTextSelected } from '@/utils/isTextSelected'

interface Props {
  editor: Editor
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
})

const store = useTiptapStore()

const { t } = useLocale()

const nodeType = computed(() => {
  const selection = props.editor.state.selection as NodeSelection
  const isLink = props.editor.isActive('link')
  const isVideo = selection.node?.type.name === 'video'
  const isText = selection instanceof TextSelection
  if (isLink) return 'link'
  if (isVideo) return 'video'
  if (isText) return 'text'
  return undefined
})

const nodeMenus = computed(() => {
  const { extensions = [] } = props.editor.extensionManager
  const find = extensions.find(k => k.name === 'base-kit') as Extension<BaseKitOptions>
  if (!find) return {}

  const { button } = find.options?.bubble ?? {}

  if (!button) return {}

  const _button: BubbleTypeMenu = button({
    editor: props.editor,
    extension: find,
    t: unref(t),
  })

  return _button
})

const shouldShow = ({ editor, view, from }) => {
  if (!view) {
    return false
  }
  const domAtPos = view.domAtPos(from || 0).node as HTMLElement
  const nodeDOM = view.nodeDOM(from || 0) as HTMLElement
  const node = nodeDOM || domAtPos
  if (store.state.AIMenu) {
    return false
  }
  if (isCustomNodeSelected(editor, node)) {
    return false
  }
  return isTextSelected({ editor })
}
const textMenu = [
  'AI',
  'divider',
  'text-bubble',
  'divider',
  'bold',
  'italic',
  'underline',
  'strike',
  'code',
  'link',
  'divider',
  'color',
  'highlight',
  'textAlign',
]

const items = computed(() => {
  if (!nodeType.value) return []
  return unref(nodeMenus)?.[nodeType.value] ?? []
})
</script>
<template>
  <BubbleMenu :editor="editor" plugin-key="textMenu" :should-show="shouldShow">
    <div
      class="border px-3 py-2 transition-all select-none pointer-events-auto shadow-sm rounded-sm bg-background w-auto max-w-[calc(-68px_+_100vw)] overflow-x-auto"
    >
      <div class="flex items-center flex-nowrap whitespace-nowrap h-[26px] justify-start relative gap-0.5">
        <template v-for="item in items">
          <!-- Divider -->
          <Separator v-if="item.type === 'divider'" orientation="vertical" class="mx-1 me-1 h-[16px]" />
          <!-- Buttons -->
          <component
            :is="item.component"
            v-else
            v-bind="item.componentProps"
            :editor="editor"
            :disabled="disabled || item.componentProps?.disabled"
          >
            <template v-for="(element, slotName) in item.componentSlots" :key="slotName" #[`${slotName}`]="values">
              <component :is="element" v-bind="values?.props" />
            </template>
          </component>
        </template>
      </div>
    </div>
  </BubbleMenu>
</template>
