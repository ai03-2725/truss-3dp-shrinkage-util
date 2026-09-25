// Japanese page content for About. Formatted long-form copy lives here so it can
// be translated in context; navigation comes from the shared container.
import type { AppApi } from '../../lib/app-api.ts'
import { Icon } from '../../components/Icon.tsx'
import { LocaleSwitcher } from '../../components/LocaleSwitcher.tsx'
import { icons } from '../../lib/icons.ts'
import { Figure } from '../../components/Guide.tsx'
import { img } from '../../lib/assets.ts'

export function AboutContent(props: { app: AppApi }) {
  return (
    <main class="container truss-about">
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

      <h1>このツールについて</h1>
      <img loading='lazy' src="og-truss.jpg" alt="Trussキャリブレーターのヘッダー画像" style="width: 100%;"/>
      <p>Truss Calibratorは、3Dプリンター用フィラメントの熱収縮率を計算・補正するためのツールです。</p>
      <p>すべてのフィラメントは熱収縮により印刷後に縮みます。Truss Calibratorは、フィラメントの利用を最小限に抑えながら、高い精度でこの収縮率を算出・補正します。</p>
      <br/>
      <p>具体的には、Trussは以下のように補正を行います。</p>
      <ul>
        <li>
          まず、利用者が現代的かつ正確なノギス（最低でも150mm幅の物体を測れるもの）を所有していることを前提とします。
        </li>
        <li>
          この前提のもと、Trussは他のキャリブレーターのような「多数の短い距離の測定」ではなく、「最小回数の長距離の測定」で収縮値を測り、測定距離の長さによって計測の誤差の影響を最小限に抑えます。
        </li>
        <li>
          計測用モデルはトラス構造の梁により、印刷に使うフィラメントを最小限に抑えつつ、計測に十分な剛性を確保しています。
        </li>
      </ul>
      <br/>
      <p>また、Trussは高い精度と利用の効率を両立させるために、2種類のテストを使い分けます。</p>
      <ul>
        <li>
          初めての利用の際には、4本の梁を持つ4軸補正ファイルを印刷します。これでX/Y軸と2本の対角線を測定します。<br/>
          このファイルは約10グラムのフィラメントを使用します。<br/>
          <Figure src={img.trussQuad} alt="4軸設計" />
        </li>
        <li>
          これらの測定をもとに、Trussは「外挿係数」を算出し、X軸のみの測定から4軸の測定値の予測を可能にします。この係数はプリンターのX/Y/対角線上の寸法のばらつきを考慮します。<br/>
          この係数はWebアプリ内に保存されます。
        </li>
        <li>
          同じプリンターでの2回目以降の利用の際、X軸のみを測定する1軸補正ファイルを印刷します。このファイルは約2.5グラムのフィラメントを利用します。<br/>
          <Figure src={img.trussSingle} alt="1軸設計" />
        </li>
        <li>
          1軸補正では、測定したX方向の測定値に保存済みの係数を掛けて、X梁のみの測定から4軸の測定結果を外挿します。これにより、少量のフィラメントと最小限の測定で、できる限り正確な収縮率を計算します。
        </li>
      </ul>
      <br/>
      <p>このウェブアプリは、計算や係数の保存などを全て自動化します。</p>
      <small>注意：プリンターと外挿係数の情報は現在利用中のブラウザのストレージにのみ保存されます。プリンター管理メニューから定期的に情報を出力してバックアップすることを強く推奨します。</small>
    </main>
  )
}
