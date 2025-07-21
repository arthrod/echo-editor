import { deleteSelection } from '@tiptap/pm/commands'
import type { Editor } from '@tiptap/vue-3'
import ActionButton from '../ActionButton.vue'
import { VIDEO_SIZE } from '@/constants'
import type { ButtonViewParams, ButtonViewReturn, ExtensionNameKeys } from '@/type'


/** Represents the types for bubble videos */
type BubbleVideoType = 'video' | 'remove'

/** Represents the overall types for bubbles */
type BubbleAllType = BubbleVideoType | ExtensionNameKeys | 'divider' | (string & {})

/** Represents the key types for node types */
export type NodeTypeKey = 'image' | 'text' | 'video'

/** Represents the menu of bubble types for each node type */
export type BubbleTypeMenu = Partial<Record<NodeTypeKey, BubbleMenuItem[]>>

/** Represents the menu of overall bubble types for each node type */
export type NodeTypeMenu = Partial<Record<NodeTypeKey, BubbleAllType[]>>

/**
 * Represents the structure of a bubble menu item.
 */
export interface BubbleMenuItem extends ButtonViewReturn {
  /** The type of the bubble item */
  type: BubbleAllType
}

/**
 * Represents a function to generate a bubble menu
 */
interface BubbleView<T = any> {
  /**
   * Generates a bubble menu based on the provided options.
   * @param {ButtonViewParams<T>} options - The options for generating the bubble menu.
   * @returns {BubbleTypeMenu} The generated bubble menu.
   */
  (options: ButtonViewParams<T>): BubbleTypeMenu
}

/**
 * Represents the options for configuring bubbles.
 * @interface BubbleOptions
 * @template T
 */
export interface BubbleOptions<T> {
  /** The menu of bubble types for each node type. */
  list: NodeTypeMenu
  /** The default list of bubble types. */
  defaultBubbleList: typeof defaultBubbleList
  /** The function to generate a bubble menu. */
  button: BubbleView<T>
}


export const defaultBubbleList = (editor: Editor): BubbleMenuItem[] => [
  {
    type: 'remove',
    component: ActionButton,
    componentProps: {
      tooltip: 'editor.remove',
      icon: 'Trash2',
      action: () => {
        const { state, dispatch } = editor.view
        deleteSelection(state, dispatch)
      },
    },
  },
]

/**
 * 生成bubble menu
 * @template T
 * @param {NodeTypeMenu} list
 * @param {BubbleMenuItem[]} defaultList
 * @param {ButtonViewParams<T>} { editor, extension, t }
 * @return {*}  {BubbleTypeMenu}
 */
export const generateBubbleTypeMenu = <T = any>(
  list: NodeTypeMenu,
  defaultList: BubbleMenuItem[],
  { editor, extension, t }: ButtonViewParams<T>
): BubbleTypeMenu => {
  const { extensions = [] } = editor.extensionManager
  const items: BubbleTypeMenu = {}

  for (const node of Object.keys(list)) {
    const nodeType = list[node as NodeTypeKey]
    if (!nodeType) continue

    const _items: BubbleMenuItem[] = []

    for (const ext of nodeType) {
      if (ext === 'divider') {
        const lastItem = _items[_items.length - 1]
        if (lastItem?.type === 'divider') continue

        _items.push({
          type: 'divider',
          component: undefined,
          componentProps: {},
        })
        continue
      }

      const find = defaultList.find(k => k.type === ext)
      if (find) {
        _items.push({
          ...find,
          componentProps: {
            ...find.componentProps,
            tooltip: find.componentProps.tooltip ? t(find.componentProps.tooltip) : undefined,
          },
          componentSlots: find.componentSlots,
        })
        continue
      }

      const findExt = extensions.find(k => k.name === ext)
      if (findExt) {
        const { button } = findExt.options as any
        const _button: ButtonViewReturn = button({
          editor,
          extension: findExt,
          t,
        })

        _items.push({
          type: ext,
          component: _button.component,
          componentProps: _button.componentProps,
          componentSlots: _button.componentSlots,
        })
        continue
      }
    }

    const lastItem = _items[_items.length - 1]
    const fristItem = _items[0]

    if (lastItem?.type === 'divider') _items.pop()
    if (fristItem?.type === 'divider') _items.shift()

    items[node as NodeTypeKey] = _items
  }

  return items
}
