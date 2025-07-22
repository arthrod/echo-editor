import { Editor, Extension, Range } from '@tiptap/core'
import { VueRenderer } from '@tiptap/vue-3'
import Suggestion, { SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion'
import { PluginKey } from '@tiptap/pm/state'
import { renderGroups } from './groups'
import MenuList from './CommandsList.vue'
import type { Group } from './types'
import { useLocale } from '@/locales'
import { autoUpdate, computePosition, flip, offset, shift } from '@floating-ui/dom'

interface SlashCommandOptions {
  getCommandGroups?: (options: { editor: Editor; presetGroups: Group[]; lang: string }) => Group[]
}

const extensionName = 'slashCommand'
let floatingElement: HTMLElement | null = null
let cleanup: (() => void) | null = null

export const SlashCommand = Extension.create<SlashCommandOptions>({
  name: extensionName,
  priority: 200,
  onCreate() {
    // 创建浮动元素容器
    floatingElement = document.createElement('div')
    floatingElement.className = 'echo-editor slash-command-menu'
    floatingElement.style.position = 'absolute'
    floatingElement.style.zIndex = '1'
    floatingElement.style.display = 'none'
    const editor = document.getElementsByClassName('echo-editor')
    if (editor) {
      editor[0].appendChild(floatingElement)
    }
  },

  onDestroy() {
    // 清理浮动元素
    if (floatingElement) {
      document.body.removeChild(floatingElement)
      floatingElement = null
    }

    // 清理自动更新
    if (cleanup) {
      cleanup()
      cleanup = null
    }
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: '/',
        allowSpaces: true,
        startOfLine: true,
        pluginKey: new PluginKey(extensionName),
        allow: ({ state, range }) => {
          const $from = state.doc.resolve(range.from)
          const isRootDepth = $from.depth === 1
          const isParagraph = $from.parent.type.name === 'paragraph'
          const isStartOfNode = $from.parent.textContent?.charAt(0) === '/'
          // TODO 行列内
          const isInColumn = this.editor.isActive('column')
          const afterContent = $from.parent.textContent?.substring($from.parent.textContent?.indexOf('/'))
          const isValidAfterContent = !afterContent?.endsWith('  ')

          return (
            ((isRootDepth && isParagraph && isStartOfNode) || (isInColumn && isParagraph && isStartOfNode)) &&
            isValidAfterContent
          )
        },
        command: ({ editor, range, props }: { editor: Editor; range: Range; props: any }) => {
          const { view } = editor
          props.action({ editor, range })
          view.focus()
        },
        items: ({ query, editor }: { query: string; editor: Editor }) => {
          const { lang } = useLocale()
          // Filter commands
          const presetGroups = renderGroups(editor)
          const groups = this.options.getCommandGroups?.({ editor, presetGroups, lang: lang.value }) || presetGroups
          const withFilteredCommands = groups.map(group => ({
            ...group,
            commands: group.commands
              .filter(item => {
                const labelNormalized = item.label.toLowerCase().trim()
                const queryNormalized = query.toLowerCase().trim()

                if (item.aliases) {
                  const aliases = item.aliases.map(alias => alias.toLowerCase().trim())
                  const labelMatch = labelNormalized.match(queryNormalized)
                  const aliasMatch = aliases.some(alias => alias.match(queryNormalized))

                  return labelMatch || aliasMatch
                }

                return labelNormalized.match(queryNormalized)
              })
              .filter(command => (command.shouldBeHidden ? !command.shouldBeHidden(this.editor) : true)),
          }))
          // Remove empty groups
          const withoutEmptyGroups = withFilteredCommands.filter(group => {
            if (group.commands.length > 0) {
              return true
            }

            return false
          })
          const withEnabledSettings = withoutEmptyGroups.map(group => ({
            ...group,
            commands: group.commands.map(command => ({
              ...command,
              isEnabled: true,
            })),
          }))

          return withEnabledSettings
        },
        render: () => {
          let component: any
          let scrollHandler: (() => void) | null = null

          return {
            onStart: (props: SuggestionProps) => {
              component = new VueRenderer(MenuList, {
                props,
                editor: props.editor,
              })

              const { view } = props.editor
              const editorNode = view.dom as HTMLElement

              // 将组件挂载到浮动元素中
              if (floatingElement) {
                floatingElement.innerHTML = ''
                floatingElement.appendChild(component.element)
                floatingElement.style.display = 'block'

                // 设置初始位置
                const updatePosition = () => {
                  if (!props.clientRect || !floatingElement) return

                  const rect = props.clientRect()
                  if (!rect) return

                  // 保存位置信息到存储中
                  props.editor.storage[extensionName].rect = rect

                  // 使用 Floating UI 计算位置
                  computePosition(
                    { getBoundingClientRect: () => rect },
                    floatingElement,
                    {
                      placement: 'bottom-start',
                      middleware: [
                        offset({ mainAxis: 8, crossAxis: 16 }),
                        shift()
                      ]
                    }
                  ).then(({ x, y }) => {
                    if (floatingElement) {
                      floatingElement.style.left = `${x}px`
                      floatingElement.style.top = `${y}px`
                      floatingElement.style.maxWidth = '16rem'
                    }
                  })
                }

                // 设置自动更新位置
                cleanup = autoUpdate(
                  editorNode,
                  floatingElement,
                  updatePosition
                )

                // 处理编辑器滚动
                scrollHandler = () => {
                  updatePosition()
                }

                view.dom.parentElement?.addEventListener('scroll', scrollHandler)

                // 初始更新位置
                updatePosition()
              }
            },

            onUpdate(props: SuggestionProps) {
              component.updateProps(props)

              const { view } = props.editor

              // 更新位置
              if (floatingElement && props.clientRect) {
                const rect = props.clientRect()
                if (rect) {
                  // 保存位置信息到存储中
                  props.editor.storage[extensionName].rect = rect

                  // 使用 Floating UI 计算位置
                  computePosition(
                    { getBoundingClientRect: () => rect },
                    floatingElement,
                    {
                      placement: 'bottom-start',
                      middleware: [
                        offset({ mainAxis: 8, crossAxis: 16 }),
                        shift()
                      ]
                    }
                  ).then(({ x, y }) => {
                    if (floatingElement) {
                      floatingElement.style.left = `${x}px`
                      floatingElement.style.top = `${y}px`
                    }
                  })
                }
              }
            },

            onKeyDown(props: SuggestionKeyDownProps) {
              if (props.event.key === 'Escape') {
                if (floatingElement) {
                  floatingElement.style.display = 'none'
                }
                return true
              }

              if (floatingElement && floatingElement.style.display === 'none') {
                floatingElement.style.display = 'block'
              }

              return component.ref?.onKeyDown(props)
            },

            onExit(props) {
              if (floatingElement) {
                floatingElement.style.display = 'none'
              }

              if (scrollHandler) {
                const { view } = props.editor
                view.dom.parentElement?.removeEventListener('scroll', scrollHandler)
              }

              if (cleanup) {
                cleanup()
                cleanup = null
              }

              component.destroy()
            },
          }
        },
      }),
    ]
  },

  addStorage() {
    return {
      rect: {
        width: 0,
        height: 0,
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
      },
    }
  },
})

export default SlashCommand
