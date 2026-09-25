// Japanese page content for Manage printers. Handlers/state come from the shared
// container; dialog copy and table labels live here so they can be translated in
// context.
import { For, Show } from 'solid-js'
import type { PrintersContentProps } from '../Printers.tsx'
import { ConfirmDialog } from '../../components/ConfirmDialog.tsx'
import { PrinterFormDialog } from '../../components/PrinterFormDialog.tsx'
import { Icon } from '../../components/Icon.tsx'
import { LocaleSwitcher } from '../../components/LocaleSwitcher.tsx'
import { icons } from '../../lib/icons.ts'
import { printerErrorMessage } from '../../lib/messages.ts'

export function PrintersContent(props: PrintersContentProps) {
  return (
    <>
      <main class="container truss-printers">
        <div class="truss-flow-topbar">
          <LocaleSwitcher app={props.app} />
          <button
            type="button"
            class="truss-icon-button"
            aria-label="ホーム"
            onClick={() => props.app.finish()}
          >
            <Icon svg={icons.house} />
          </button>
        </div>

        <h1>プリンター管理</h1>
        <p>
          プリンター情報は利用中のブラウザのみに保存されます。万が一のためにデータを出力して保存しておくことを強く推奨します。
        </p>

        <Show
          when={props.app.printers().length > 0}
          fallback={<p class="truss-note">保存されたプリンターはまだありません。下で追加するか、クアッド校正を実行してください。</p>}
        >
          <table class="truss-printer-table">
            <caption class="truss-visually-hidden">保存済みプリンタープロファイル</caption>
            <thead>
              <tr>
                <th scope="col">名前</th>
                <th scope="col">外挿係数</th>
                <th scope="col">操作</th>
              </tr>
            </thead>
            <tbody>
              <For each={props.app.printers()}>
                {(printer, index) => (
                  <tr>
                    <td data-label="名前">{printer.name}</td>
                    <td data-label="係数">{String(printer.extrapolationFactor)}</td>
                    <td data-label="操作" class="truss-row-actions">
                      <button
                        type="button"
                        class="truss-button-secondary"
                        onClick={() => props.onEdit(index())}
                      >
                        編集
                      </button>
                      <button
                        type="button"
                        class="truss-button-secondary"
                        onClick={() => props.onDelete(index())}
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </Show>

        <div class="truss-printer-toolbar">
          <button type="button" onClick={props.onAdd}>
            プリンターを追加
          </button>
          <button type="button" class="truss-button-secondary" onClick={props.onExport}>
            JSONをエクスポート
          </button>
          <button type="button" class="truss-button-secondary" onClick={props.onImportClick}>
            JSONをインポート
          </button>
          <input
            ref={props.setFileInput}
            class="truss-visually-hidden"
            type="file"
            accept="application/json,.json"
            aria-label="JSONファイルからプリンタープロファイルをインポート"
            onChange={(event) => props.onImport(event.currentTarget.files?.[0])}
          />
        </div>

        {props.importError && (
          <p class="truss-error" role="alert">
            インポートに失敗しました：{printerErrorMessage(props.app.locale(), props.importError)}
          </p>
        )}
        {props.importSkipped.length > 0 && (
          <p class="truss-warning" role="status">
            インポートしましたが、すでに存在する{props.importSkipped.length}件の同名のプリンターについては上書きせず、ブラウザに保存されている情報を維持しました：{props.importSkipped.join(', ')}。
          </p>
        )}

        <section class="truss-preference" aria-labelledby="truss-preference-title">
          <h2 id="truss-preference-title">その他の設定</h2>
          <label class="truss-checkbox">
            <input
              type="checkbox"
              checked={props.app.skipEquipment()}
              onChange={(event) => props.app.setSkipEquipment(event.currentTarget.checked)}
            />
            4軸補正にて「機材の確認」画面をスキップする
          </label>
        </section>
      </main>

      <Show when={props.adding}>
        <PrinterFormDialog
          title="プリンターを追加"
          initialName=""
          initialFactor=""
          onClose={props.onCloseAdd}
          onSubmit={(name, factor) => props.onSubmitAdd(name, factor)}
        />
      </Show>

      <Show when={props.editingIndex !== null}>
        <PrinterFormDialog
          title="プリンターを編集"
          initialName={props.app.printers()[props.editingIndex!].name}
          initialFactor={String(props.app.printers()[props.editingIndex!].extrapolationFactor)}
          onClose={props.onCloseEdit}
          onSubmit={(name, factor) => props.onSubmitEdit(props.editingIndex!, name, factor)}
        />
      </Show>

      <Show when={props.deletingIndex !== null}>
        <ConfirmDialog
          title="プリンターを削除しますか？"
          message={`“${props.app.printers()[props.deletingIndex!].name}”を削除しますか？削除された情報は復元できません。`}
          confirmLabel="削除"
          onConfirm={props.onConfirmDelete}
          onCancel={props.onCloseDelete}
        />
      </Show>
    </>
  )
}
