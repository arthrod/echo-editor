<script lang="ts" setup>
import { ref, watch, computed } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { isActive } from '@tiptap/vue-3'
import { BubbleMenu } from '@tiptap/vue-3/menus'
import { getRenderContainer } from '@/utils/getRenderContainer'
import { useLocale } from '@/locales'
import { deleteSelection } from '@tiptap/pm/commands'
import { Separator } from '@/components/ui/separator'
import ActionButton from '@/components/ActionButton.vue'
import { VIDEO_SIZE } from '@/constants'

interface Props {
  editor: Editor
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
})
const { t } = useLocale()
const imagePercent = ref('100')

function changeImagePercent(event?: any) {
  event?.preventDefault()
  const percent = Math.max(0, Math.min(100, parseInt(imagePercent.value)))
  props.editor
    .chain()
    .focus(undefined, { scrollIntoView: false })
    .updateImage({ width: `${percent}%` })
    .run()
}
const shouldShow = ({ editor }) => isActive(editor.view.state, 'video')

const getReferenceClientRect = computed(() => {
  const renderContainer = getRenderContainer(props.editor, 'node-image')
  return renderContainer?.getBoundingClientRect() || new DOMRect(-1000, -1000, 0, 0)
})

watch(imagePercent, () => {
  if (imagePercent.value) {
    changeImagePercent()
  }
})

function handleSize(size: 'size-small' | 'size-medium' | 'size-large') {
  props.editor.commands.updateVideo({ width: VIDEO_SIZE[size] })
}
function handleRemove() {
  const { state, dispatch } = props.editor.view
  deleteSelection(state, dispatch)
}
</script>
<template>
  <BubbleMenu :editor="editor" :shouldShow="shouldShow" :updateDelay="0">
    <div
      class="border px-3 py-2 transition-all select-none pointer-events-auto shadow-sm rounded-sm w-auto bg-background"
    >
      <div class="flex items-center flex-nowrap whitespace-nowrap h-[26px] justify-start relative gap-0.5">
        <ActionButton
          :tooltip="t('editor.image.menu.flipX')"
          icon="SizeS"
          :is-active="() => editor.isActive('video', { width: VIDEO_SIZE['size-small'] })"
          :action="() => handleSize('size-small')"
        />
        <ActionButton
          :tooltip="t('editor.image.menu.flipY')"
          icon="SizeM"
          :is-active="() => editor.isActive('video', { width: VIDEO_SIZE['size-medium'] })"
          :action="() => handleSize('size-medium')"
        />
        <ActionButton
          :tooltip="t('editor.image.menu.flipY')"
          icon="SizeL"
          :is-active="() => editor.isActive('video', { width: VIDEO_SIZE['size-large'] })"
          :action="() => handleSize('size-large')"
        />
        <Separator orientation="vertical" class="mx-1 me-2 h-[16px]" />
        <ActionButton
          :tooltip="t('editor.remove')"
          icon="Trash2"
          :action="handleRemove"
          :disabled="!editor.isEditable"
        />
      </div>
    </div>
  </BubbleMenu>
</template>
