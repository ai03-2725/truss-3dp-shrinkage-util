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
      <p>Trussキャリブレーターは、3Dプリンター用フィラメントの収縮を校正するためのツールです。</p>
      <p>すべてのフィラメントは熱収縮により印刷後に縮みます。Trussは、この挙動を高い精度で算出・補正し、フィラメントの無駄を最小限に抑えることを目指しています。</p>
      <br/>
      <p>具体的には、Trussは以下の方法でこれを実現します：</p>
      <ul>
        <li>
          Trussは、幅140mmの対象物を測定できる、現代的で正確なノギスを前提としています（最近のノギスの多くは150mm以上の測定長があります）。
        </li>
        <li>
          この前提のもと、Trussは他のキャリブレーターのような多数の小さな測定ではなく、幅140mmの寸法を横断する「一発式」の長距離測定を用います。これにより測定誤差やノイズの影響を最小限に抑え、わずかな測定回数で正確な収縮量を得られます。
        </li>
        <li>
          トラス梁構造により、テスト印刷に使うフィラメント量を最小限に抑えつつ、測定段階に十分な構造剛性を確保します。
        </li>
      </ul>
      <br/>
      <p>Trussキャリブレーターは、最高の精度と速度のバランスを取るために2種類のテスト印刷を使い分けます：</p>
      <ul>
        <li>
          まず、4本梁のファイルを印刷します。これはX/Y軸と2本の対角線を測定するために使用します。<br/>
          このファイルは約10グラムのフィラメントを使用します。<br/>
          <Figure src={img.trussQuad} alt="クアッドビーム設計" />
        </li>
        <li>
          これらの最初の測定値をもとに、Trussは「外挿係数」を算出し、X軸のみの測定から4軸測定の値を予測します。これはプリンターの寸法上の歪みやばらつきを考慮します。<br/>
          この値はWebアプリ内に保存されます。
        </li>
        <li>
          2回目以降は、X軸のみを測定するシングルビームファイルを印刷します。このファイルは約2.5グラムのフィラメントしか使用しません。<br/>
          <Figure src={img.trussSingle} alt="シングルビーム設計" />
        </li>
        <li>
          シングルビーム校正では、測定したX長に保存済みの倍率を掛けて、X梁のみの測定からクアッドビーム全体の結果を外挿します。これにより、ごく少量のフィラメントと最小限の手作業測定で、正確な収縮補正値を得られます。
        </li>
      </ul>
      <br/>
      <p>Web UIが、使いやすさのために平均化と乗算をすべて代行します。</p>
      <small>注意：プリンターとその外挿係数は現在ブラウザーのストレージにのみ保存されます。バックアップとしてプリンターリストをエクスポートしてください。</small>
    </main>
  )
}
