// Japanese page content for Home. Layout may differ from English; shared behavior
// comes from the container.
import type { AppApi } from '../../lib/app-api.ts'
import { Icon } from '../../components/Icon.tsx'
import { LocaleSwitcher } from '../../components/LocaleSwitcher.tsx'
import { icons } from '../../lib/icons.ts'

export function HomeContent(props: { app: AppApi; hasPrinters: boolean }) {
  return (
    <main class="container truss-home">
      <h1 class="text-center">Trussキャリブレーター</h1>
      <p class="text-center">
        フィラメントのXY収縮を素早く正確に校正し、時間とフィラメントの無駄を最小限に抑えます。
      </p>

      <div class="truss-card-list">
        <button type="button" class="truss-card" onClick={props.app.startQuad}>
          <span class="truss-card-content">
            <span class="truss-card-title">クアッドビーム校正</span>
            <span class="truss-card-body">
              本格的な校正を実行します。 <br/>
              使用するプリンターでTrussキャリブレーターを初めて使う場合はここから始めてください。
            </span>
          </span>
          <span class="truss-card-action">
            <span class="truss-card-action-label">本校正を開始</span>
            <span class="truss-card-arrow" aria-hidden="true">
              →
            </span>
          </span>
        </button>

        <button
          type="button"
          class="truss-card"
          onClick={props.app.startSingle}
          disabled={!props.hasPrinters}
        >
          <span class="truss-card-content">
            <span class="truss-card-title">シングルビーム校正</span>
            <span class="truss-card-body">
              迅速な校正を実行します。 <br/>
              使用するプリンターでクアッドビーム校正をすでに実行済みの場合に使用します。
            </span>
            {!props.hasPrinters && (
              <span class="truss-card-note">
                保存済みのプリンターが必要です。先にクアッドビーム校正を実行するか、プリンター管理
                メニューからプリンターをインポートしてください。
              </span>
            )}
          </span>
          <span class="truss-card-action">
            <span class="truss-card-action-label">簡易校正を開始</span>
            <span class="truss-card-arrow" aria-hidden="true">
              →
            </span>
          </span>
        </button>

        <button type="button" class="truss-card" onClick={props.app.openPrinters}>
          <span class="truss-card-content">
            <span class="truss-card-title">プリンター管理</span>
            <span class="truss-card-body">
              保存済みプリンタープロファイルの編集とインポート/エクスポート。
            </span>
          </span>
          <span class="truss-card-action">
            <span class="truss-card-action-label">プリンター管理</span>
            <span class="truss-card-arrow" aria-hidden="true">
              →
            </span>
          </span>
        </button>

        <button type="button" class="truss-card" onClick={props.app.openAbout}>
          <span class="truss-card-content">
            <span class="truss-card-title">このツールについて</span>
            <span class="truss-card-body">Trussキャリブレーターの概要。</span>
          </span>
          <span class="truss-card-action">
            <span class="truss-card-action-label">このツールについて</span>
            <span class="truss-card-arrow" aria-hidden="true">
              →
            </span>
          </span>
        </button>
      </div>

      <div class="truss-home-links">
        <a
          class="truss-icon-button"
          href="https://github.com/ai03-2725/truss-3dp-shrinkage-util"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHubでソースを表示"
          title="GitHubリポジトリ"
        >
          <Icon svg={icons.githubLogo} />
        </a>
        <a
          class="truss-icon-button"
          href="https://ai03.com"
          // target="_blank"
          target="_self"
          // rel="noopener noreferrer"
          aria-label="ai03.com"
          title="ai03.com"
        >
          <Icon svg={icons.houseLine} />
        </a>
        <LocaleSwitcher app={props.app} />
      </div>
    </main>
  )
}
