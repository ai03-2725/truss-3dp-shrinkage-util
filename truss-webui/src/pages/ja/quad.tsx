// Japanese page content for the Quad flow. Each step's prose and figures can be
// reordered independently; gating, navigation, and calculations come from the
// shared containers in ../quad.tsx.
import { For } from 'solid-js'
import type { AppApi } from '../../lib/app-api.ts'
import type { BeamInput, QuadInput } from '../../lib/types.ts'
import { BeamFields } from '../../components/BeamFields.tsx'
import { Figure, InnerJawGuidance, MeasurementWarnings } from '../../components/Guide.tsx'
import { Icon } from '../../components/Icon.tsx'
import { ResultPercent } from '../../components/ResultPercent.tsx'
import { icons } from '../../lib/icons.ts'
import { messages } from '../../lib/messages.ts'
import { img, stl } from '../../lib/assets.ts'

export function QuadEquipmentContent(props: { app: AppApi; complete: boolean }) {
  const equipment = () => props.app.active()!.equipment

  return (
    <>
      <p>開始する前に、次の3つの前提条件をすべて満たしていることを確認してください。</p>
      <ul class="truss-checklist">
        <li>
          <label class="truss-checkbox">
            <input
              type="checkbox"
              checked={equipment().calipers}
              onChange={(event) => props.app.updateEquipment({ calipers: event.currentTarget.checked })}
            />
            <span>
              <strong>現代的で信頼できるデジタルノギス。</strong> <br/>
              ノギスは幅140mmの対象物を測定できる十分な大きさが必要です。<br/>
              また、誤差やドリフトなく安定して測定できる必要があります。<br/>
            </span>
          </label>
        </li>
        <li>
          <label class="truss-checkbox">
            <input
              type="checkbox"
              checked={equipment().printer}
              onChange={(event) => props.app.updateEquipment({ printer: event.currentTarget.checked })}
            />
            <span>
              <strong>正常に動作し校正済みの現代的なプリンター。</strong> <br/>
              プリンターは、反り・カール・変形なく幅140mmの対象物を安定して印刷できる必要があります。 <br/>
              自作プリンターの場合は、事前にすべての動作が正しく校正されていることを確認してください。Klipperを使用しているプリンターは、XYスキュー補正を算出して有効にしておくのが理想的です。
            </span>
          </label>
        </li>
        <li>
          <label class="truss-checkbox">
            <input
              type="checkbox"
              checked={equipment().slicer}
              onChange={(event) => props.app.updateEquipment({ slicer: event.currentTarget.checked })}
            />
            <span>
              <strong>現代的なスライサー。</strong> <br/>
              スライサーは提供されたシンプルなモデルを安定してスライスでき、フィラメントごとのXY収縮設定を備えている必要があります（例：OrcaSlicer、Bambu Studio、SuperSlicer）。
            </span>
          </label>
        </li>
      </ul>

      <label class="truss-checkbox truss-dont-ask">
        <input
          type="checkbox"
          disabled={!props.complete}
          checked={props.app.skipEquipment()}
          onChange={(event) => props.app.setSkipEquipment(event.currentTarget.checked)}
        />
        <small>次回から確認しない - 今後の校正でこの画面をスキップする</small>
      </label>
    </>
  )
}

export function QuadFilamentContent(props: { app: AppApi }) {
  const tuning = () => props.app.active()!.tuning

  return (
    <>
      <p>フィラメントの事前調整がすべて完了していることを確認してください。</p>
      <ul class="truss-checklist">
        <li>
          <label class="truss-checkbox">
            <input
              type="checkbox"
              checked={tuning().temperature}
              onChange={(event) => props.app.updateTuning({ temperature: event.currentTarget.checked })}
            />
            <span>
              <strong>温度設定。</strong><br/>
              通常はメーカー推奨の設定で十分です。 <br/>
              温度タワーを印刷する場合は、折って層間接着を確認することを強くおすすめします。
            </span>
          </label>
        </li>
        <li>
          <label class="truss-checkbox">
            <input
              type="checkbox"
              checked={tuning().pressure}
              onChange={(event) => props.app.updateTuning({ pressure: event.currentTarget.checked })}
            />
            <span>
              <strong>プレッシャーアドバンス / フローダイナミクス。</strong> <br/>
              OrcaSlicerの校正ユーティリティ（上部メニューバー → 校正 → Pressure Advance）またはBambu Studioの校正ページ（Calibrationタブ → Flow dynamics）の使用をおすすめします。 <br/> 
              選択した値がプリンターに正しく適用されていることを確認してください（BambuではDevice → FilamentからK値を選択する必要がある場合があります。Klipperデバイスでは、スタートGコードなどで<code>pressure_advance[0]</code>などの値を受け取る必要がある場合があります）。
            </span>
          </label>
        </li>
        <li>
          <label class="truss-checkbox">
            <input
              type="checkbox"
              checked={tuning().flow}
              onChange={(event) => props.app.updateTuning({ flow: event.currentTarget.checked })}
            />
            <span>
              <strong>流量 / フロー比。</strong> <br/>
              OrcaSlicerの校正ユーティリティ（上部メニューバー → 校正 → Flow Ratio。「YOLO single-pass」方式を強く推奨）またはBambu Studioの校正ページ（Calibrationタブ → Flow rate）の使用をおすすめします。 <br/> 
              Bambu Studio内蔵の2パス校正を使う場合、1回目で2つのチップのどちらを選ぶか迷ったら高い方の値を選んでください。2回目は1回目より低い値のみをテストします。
            </span>
          </label>
        </li>
      </ul>
    </>
  )
}

export function QuadSliceContent() {
  return (
    <>
      <p>
       クアッドビーム校正モデルをダウンロードし、お使いのスライサーでスライスしてください。 <br/>
        このガイドはOrcaSlicer / Bambu Studioを対象としています。他のスライサーでは手順を適宜読み替えてください。
      </p>

      <p>
        <a class="button truss-icon-label" href={stl.quad} download="Truss Calibration Beam Quad.stl">
          <Icon svg={icons.downloadSimple} />
          クアッド校正ビームをダウンロード（STL）
        </a>
      </p>

      <Figure src={img.trussQuad} alt="クアッドTruss校正ビームの設計" caption="クアッドビーム設計。" />

      <p>
        安定して正確に印刷できる設定でスライスしてください。速度を上げすぎて反り・カール・オーバーシュートが発生しないようにします。  
      </p>
      <Figure src={img.slicerLoaded} alt="スライサーに読み込まれたクアッドビーム" />

      <h3>測定面にシームがないことを確認する</h3>
      <p>
        スライス後のプレビューで、測定に使用する壁（下図）にシームが配置されていないことを確認してください。 <br/>
        必要に応じてシーム表示を有効にし、移動が必要なシームがあればシーム配置設定を調整するか、手動のシームペイントツールを使用してください。
      </p>
      <div class="truss-image-grid">
        <Figure src={img.outerMeasurementWalls} alt="外側測定に使用する壁" caption="外側測定用の壁。" />
        <Figure src={img.innerMeasurementWalls} alt="内側測定に使用する壁" caption="内側測定用の壁。" />
        <Figure src={img.seamVisibility} alt="スライサープレビューでシーム表示を有効にする" caption="シーム表示の有効化。" />
        <Figure src={img.seamTool} alt="スライサーのシームペイントツール" caption="OrcaSlicer/Bambu Studioのシームペイントツール。" />
      </div>
      <Figure src={img.outerSeamExample} alt="測定面から離れた位置に移動したシーム" caption="シームペイントツールでシーム位置を測定壁から離して指定する。" />
    </>
  )
}

export function QuadPrintContent() {
  return (
    <>
      <p>スライスしたファイルを印刷します。</p>
      <Figure src={img.printingQuad} alt="印刷中のクアッドビーム" />
      <div class="truss-callout">
        <h3>プリントの取り外し</h3>
        <p>
          <strong>プリントをビルドプレートから無理に剥がさないでください</strong>。プリントが反り、
          測定値が無意味になるおそれがあります。 <br/>
          プリントが完全に冷えるまで待ってから、ビルドプレートから取り外してください。 <br/>
          <strong>ビルドプレートに付いたままのプリントを測定しないでください。</strong>
        </p>
      </div>
      <Figure src={img.finishedPrint} alt="完成し冷却されたクアッドビームのプリント" caption="取り外して測定する前にプリントを冷ましてください。" />
    </>
  )
}

export function QuadLocateContent() {
  return (
    <>
      <p>
        X軸に沿ったX梁を探します。プリントには<strong>X</strong>のラベルが付いています。
      </p>
      <p>
        注：文字は下に示す試作段階から拡大されています。実際に印刷したものはより読み取りやすく識別しやすくなっています。
      </p>
      <Figure src={img.xBeam} alt="プリント上でXラベルが付いたX梁" />
    </>
  )
}

export function QuadXContent(props: { app: AppApi; beam: BeamInput }) {
  return (
    <>
      <MeasurementWarnings />

      <p>X梁を横断する次の2つの寸法（外側と内側）を測定します。</p>
      <p>必要に応じて画像をタップ/クリックして拡大し、さらにズームできます。</p>
      <div class="truss-image-grid">
        <Figure src={img.xOuterDiagram} alt="X外側測定の図" caption="外側測定。" />
        <Figure src={img.xOuterMeasurement} alt="ノギスによるX外側測定の写真" />
        <Figure src={img.xInnerDiagram} alt="X内側測定の図" caption="内側測定。" />
        <Figure src={img.xInnerMeasurement} alt="ノギスによるX内側測定の写真" />
      </div>

      <InnerJawGuidance />

      <p>寸法を測定したら、下に値を入力してください。 <br/>
      常に正しい梁（Xが付いたもの）を測定していることを確認してください。</p>
      <BeamFields
        idPrefix="quad-x"
        legend="X梁"
        beam={props.beam}
        onChange={(patch) => props.app.updateQuadBeam('x', patch)}
      />
    </>
  )
}

export function QuadYabContent(props: { app: AppApi; quad: QuadInput }) {
  const axes = [
    { axis: 'y' as const, label: 'Y' },
    { axis: 'a' as const, label: 'A' },
    { axis: 'b' as const, label: 'B' },
  ]

  return (
    <>
      <p>
        残り3本の梁についても、同じ内側/外側の2つの測定を繰り返します。 <br/> 
        正しい梁を測定し、正しい入力欄に値を入力していることを確認してください。
      </p>
      <div class="truss-callout">
        <p>
          X梁と同じ注意事項に従ってください。過剰な力を加えない、平行に合わせる、内側の梁を正しく測定する、の3点です。 
        </p>
        <p>
          ページ下部の戻るボタンでいつでも前の手順を確認できます。入力した値はその都度保存されます。
        </p>
      </div>

      <p class="truss-note">
        X梁の入力済みの値：外側 {props.quad.x.outer || '—'} mm、内側 {props.quad.x.inner || '—'} mm
      </p>

      <For each={axes}>
        {(entry) => (
          <BeamFields
            idPrefix={`quad-${entry.axis}`}
            legend={`${entry.label}梁`}
            beam={props.quad[entry.axis]}
            onChange={(patch) => props.app.updateQuadBeam(entry.axis, patch)}
          />
        )}
      </For>
    </>
  )
}

export function QuadNameContent(props: { app: AppApi; name: string; duplicate: boolean }) {
  return (
    <>
      <p>
        プリンターの特性はブラウザーに保存されます。これにより、今後シングルビームの簡易校正フローを利用できます。  <br/>
        このプリンターに識別しやすい名前を付けてください。同じ機種を複数台お持ちの場合は、名前で個体を区別できるようにしてください。
      </p>
      <p class="truss-note">
        この係数はこのプリンター固有のもので、スキューが一貫している間のみ有効です。後で
        スキュー補正の変更やプリンターの分解整備によってスキュー設定を変更した場合は、クアッドビーム校正フローを再実行してください。
      </p>

      <div class="truss-field">
        <label for="quad-printer-name">プリンター名</label>
        <input
          id="quad-printer-name"
          type="text"
          autocomplete="off"
          value={props.name}
          aria-describedby={
            [props.duplicate ? 'quad-printer-name-warning' : '', props.name.trim() === '' ? 'quad-printer-name-error' : '']
              .filter(Boolean)
              .join(' ') || undefined
          }
          onInput={(event) => props.app.updateQuad({ printerName: event.currentTarget.value })}
        />
        {props.name.trim() === '' && (
          <p id="quad-printer-name-error" class="truss-error" role="alert">
            プリンター名を入力してください。
          </p>
        )}
        {props.duplicate && (
          <p id="quad-printer-name-warning" class="truss-warning" role="status">
            “{props.name.trim()}”という名前のプリンターはすでに存在します。続行すると保存済みの係数が上書きされます。
          </p>
        )}
      </div>
    </>
  )
}

export function QuadResultContent(props: {
  app: AppApi
  shrinkage: string
  factor: number
  recommendedPercent: string | null
  currentValid: boolean
  percentWarning: boolean
}) {
  const quad = () => props.app.active()!.quad
  const t = () => messages(props.app.locale())

  return (
    <>
      <small>
        このプリントの測定収縮率： <strong>{props.shrinkage}</strong>
      </small>

      {props.app.active()!.quadSaveFailed && (
        <div class="truss-callout truss-callout-warning">
          <h3>プリンターの外摺係数を保存できませんでした</h3>
          <p>
            ブラウザーのストレージが利用できないため、このプリンターのスキュー情報は今後のシングルビーム校正用に保存されませんでした。
            後でプリンター管理から追加できるよう、手動で控えておいてください：
          </p>
          <p class="truss-factor">
            <strong>{String(props.factor)}</strong>
          </p>
        </div>
      )}

      <h3>現在のフィラメントXY収縮設定を確認する</h3>
      <p>
        フィラメントの設定を開き、現在のXY収縮値を確認します。通常は100%が初期値です。 <br/>
        下に入力してください。  
      </p>
      <Figure src={img.shrinkageAdjust1} alt="フィラメント設定でXY収縮設定を確認する" caption="OrcaSlicer/Bambu StudioでのXY収縮の場所。" />

      <div class="truss-field">
        <label for="quad-current-xy">スライサーでの現在のXY収縮率（%）</label>
        <input
          id="quad-current-xy"
          type="text"
          inputmode="decimal"
          autocomplete="off"
          value={quad().currentXY}
          aria-describedby={
            [props.percentWarning ? 'quad-current-xy-warning' : '', !props.currentValid ? 'quad-current-xy-error' : '']
              .filter(Boolean)
              .join(' ') || undefined
          }
          onInput={(event) => props.app.updateQuad({ currentXY: event.currentTarget.value })}
        />
        {props.percentWarning && (
          <p id="quad-current-xy-warning" class="truss-warning" role="status">
            {t().percentRangeWarning}
          </p>
        )}
        {!props.currentValid && (
          <p id="quad-current-xy-error" class="truss-error" role="alert">
            {t().invalidNumber}
          </p>
        )}
      </div>

      <ResultPercent percent={props.recommendedPercent} />

      <h3>結果を適用する</h3>
      <p>
        上で求めた更新後の収縮率を、元の収縮値を取得したのと同じ欄に貼り付けます。
      </p>
      <Figure src={img.shrinkageAdjust2} alt="計算された割合に調整されたXY収縮値" caption="更新後の割合の例。" />

      <p>
        他のスライサーでは、手順を適宜読み替えてください。
      </p>
    </>
  )
}
