// Japanese page content for Home. Layout may differ from English; shared behavior
// comes from the container.
import type { AppApi } from '../../lib/app-api.ts'
import { Icon } from '../../components/Icon.tsx'
import { LocaleSwitcher } from '../../components/LocaleSwitcher.tsx'
import { icons } from '../../lib/icons.ts'

export function HomeContent(props: { app: AppApi; hasPrinters: boolean }) {
  return (
    <main class="container truss-home">
      <h1 class="text-center">Truss Calibrator</h1>
      <p class="text-center">
        3Dプリンター用フィラメントの熱収縮率を測定・補正するツール
      </p>

      <div class="truss-card-list">
        <button type="button" class="truss-card" onClick={props.app.startQuad}>
          <span class="truss-card-content">
            <span class="truss-card-title">４軸補正</span>
            <span class="truss-card-body">
              4つの軸（X/Y/斜め2つ）を測定し補正を行います。 <br/>
              使用するプリンターでTrussを初めて使う場合はここから始めてください。
            </span>
          </span>
          <span class="truss-card-action">
            <span class="truss-card-action-label">Start</span>
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
            <span class="truss-card-title">１軸補正</span>
            <span class="truss-card-body">
              1軸（X軸）のみの測定から4軸の数値を外挿することで、素早く収縮補正を行います。 <br/>
              過去に4軸補正で利用したプリンターを再度使う際にはこちらをご利用ください。
            </span>
            {!props.hasPrinters && (
              <span class="truss-card-note">
                保存済みのプリンターが必要です。先にクアッドビーム校正を実行するか、プリンター管理
                メニューからプリンターをインポートしてください。
              </span>
            )}
          </span>
          <span class="truss-card-action">
            <span class="truss-card-action-label">Start</span>
            <span class="truss-card-arrow" aria-hidden="true">
              →
            </span>
          </span>
        </button>

        <button type="button" class="truss-card" onClick={props.app.openPrinters}>
          <span class="truss-card-content">
            <span class="truss-card-title">プリンター管理</span>
            <span class="truss-card-body">
              保存済みのプリンターの編集、保存、読み込みなどを行えます。
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
            <span class="truss-card-title">概要</span>
            <span class="truss-card-body">Truss Calibratorについての説明</span>
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
