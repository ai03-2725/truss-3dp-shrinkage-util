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
      <p>必要な機材が揃っていることを確認してください。</p>
      <ul class="truss-checklist">
        <li>
          <label class="truss-checkbox">
            <input
              type="checkbox"
              checked={equipment().calipers}
              onChange={(event) => props.app.updateEquipment({ calipers: event.currentTarget.checked })}
            />
            <span>
              <strong>正確なノギス</strong> <br/>
              幅140mmの印刷物を測定できるノギスを準備してください。<br/>
              必要であれば事前に校正などを行い、正確に測定できる状態であることをご確認ください。
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
              <strong>正しく動作する3Dプリンター</strong> <br/>
              幅140mm程度のプリントデータを反りや変形なく印刷できる程度の性能が必要です。 <br/>
              自作プリンターの場合、事前にすべての動作設定が正しく校正されていることを確認してください。Klipperを使用しているプリンターの場合、可能であればXY面の歪み補正（XY Skew Correction）を適用してください。
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
              <strong>現代的なスライサー</strong> <br/>
              補正用モデルを正しくスライスでき、フィラメントごとのXY収縮率（XY Shrinkage）を設定できるスライサー（OrcaSlicer、Bambu Studio、SuperSlicerなど）をご利用ください。<br/>
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
        <small>次回から確認しない - 今後この画面をスキップする</small>
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
              <strong>温度設定</strong><br/>
              ほとんどの場合はメーカー推奨の設定で十分です。 <br/>
              温度タワーを印刷する場合、タワーを折って層間接着を確認することを強くおすすめします。
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
              <strong>圧力アドバンス / 動的流量</strong> <br/>
              OrcaSlicerのキャリブレーションツール（上部メニューバー → キャリブレーション → 圧力アドバンス）またはBambu Studioのキャリブレーションページ（キャリブレーションタブ → 動的流量）の使用をおすすめします。 <br/> 
              測定した値がプリンターに正しく適用されていることをご確認ください。（Bambuプリンターの場合はデバイス → フィラメントからK値を選択、Klipperプリンターの場合は開始G-codeなどで<code>pressure_advance[0]</code>などの値をプリンターに適用）
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
              <strong>流量比</strong> <br/>
              OrcaSlicerのキャリブレーションツール（上部メニューバー → キャリブレーション → 流量比、「YOLO」方式を推奨）またはBambu Studioのキャリブレーションページ（キャリブレーションタブ → 流量）の使用をおすすめします。 <br/> 
              Bambu Studio内蔵の2段階キャリブレーションを使う場合、もし1段階目で2つのチップのどちらを選ぶかで迷った場合、数値が高い方を選んでください。2段階目は1段階目で選んだ値より低い値のみをテストします。
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
        4軸補正の3Dモデルをダウンロードし、お使いのスライサーでスライスしてください。 <br/>
        このガイドはOrcaSlicer / Bambu Studioを対象としています。他のスライサーをご利用の場合、必要に応じて手順を変更してください。
      </p>

      <p>
        <a class="button truss-icon-label" href={stl.quad} download="Truss Calibration Beam Quad.stl">
          <Icon svg={icons.downloadSimple} />
          4軸補正用モデルをダウンロード（Truss Calibration Beam Quad.stl）
        </a>
      </p>

      <Figure src={img.trussQuad} alt="4軸補正用モデル" caption="4軸補正用モデル" />

      <p>
        正確かつ確実に印刷できる設定でスライスしてください。<br/>
        印刷時に曲がり角などで移動の超過が起きるほど早く印刷したり、反りなどの製造不備が発生するような設定は避けてください。
      </p>
      <Figure src={img.slicerLoaded} alt="スライサーに読み込まれた4軸補正用モデル" />

      <h3>測定面に継ぎ目がないことを確認する</h3>
      <p>
        スライス後のプレビュー画面で継ぎ目表示を有効にし、測定に使用する面（下図）に継ぎ目が配置されていないことを確認してください。 <br/>
        継ぎ目の移動が必要な場合、継ぎ目位置の設定の調整または手動の継ぎ目ペイントツールを使用してください。
      </p>
      <div class="truss-image-grid">
        <Figure src={img.outerMeasurementWalls} alt="外側の測定に使用する面" caption="外側の測定用の面" />
        <Figure src={img.innerMeasurementWalls} alt="内側の測定に使用する面" caption="内側の測定用の面" />
        <Figure src={img.seamVisibilityJa} alt="継ぎ目表示の有効化" caption="継ぎ目表示の有効化" />
        <Figure src={img.seamToolJa} alt="継ぎ目ペイントツール" caption="OrcaSlicer/Bambu Studioの継ぎ目ペイントツール。" />
      </div>
      <Figure src={img.outerSeamExampleJa} alt="継ぎ目ペイントツール利用の例" caption="継ぎ目ペイントツールで測定面以外を指定した例" />
    </>
  )
}

export function QuadPrintContent() {
  return (
    <>
      <p>スライスしたファイルを印刷します。</p>
      <Figure src={img.printingQuad} alt="印刷中の4軸モデル" />
      <div class="truss-callout">
        <h3>造形物の取り外し</h3>
        <p>
          <strong>造形物をビルドプレートから無理やり剥がさないでください</strong>。造形物が反ってしまい、測定値が無効になるおそれがあります。 <br/>
          造形物が完全に冷えるまで待ってから、ビルドプレートから慎重に取り外してください。 <br/>
          <strong>ビルドプレートに付いた状態のまま測定を行わないでください。</strong>
        </p>
      </div>
      <Figure src={img.finishedPrint} alt="取り外し前の造形物" caption="取り外し前の造形物" />
    </>
  )
}

export function QuadLocateContent() {
  return (
    <>
      <p>
        X軸に対応するX梁を見つけます。プリント本体にXのラベルが付いています。
      </p>
      <p>
        注：以下の写真は試作品のものです。実際に印刷したファイルではラベルが拡大されて読みやすくなっているはずです。
      </p>
      <Figure src={img.xBeam} alt="プリント上でXラベルが付いたX梁" />
    </>
  )
}

export function QuadXContent(props: { app: AppApi; beam: BeamInput }) {
  return (
    <>
      <MeasurementWarnings />

      <p>X梁の2つの計測点（外側と内側）を測定します。</p>
      <p>必要に応じて画像をタップ/クリックし、拡大してご確認ください。</p>
      <div class="truss-image-grid">
        <Figure src={img.xOuterDiagram} alt="X外側測定の図" caption="外側の測定用の面" />
        <Figure src={img.xOuterMeasurement} alt="ノギスによる外側の面の測定" />
        <Figure src={img.xInnerDiagram} alt="X内側測定の図" caption="内側の測定用の面" />
        <Figure src={img.xInnerMeasurement} alt="ノギスによる内側の面の測定" />
      </div>

      <InnerJawGuidance />

      <p>注意点を踏まえて寸法し、測定値をを入力してください。 <br/>
      正しい梁（Xが付いたもの）を測定していることを確認してください。</p>
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
        残り3本の梁を同様に測定してください。<br/> 
        測定後、数値を入力してください。
      </p>
      <div class="truss-callout">
        <p>
          X梁と同じ注意事項に従って測定してください。
        </p>
        <p>
          ページ下部の「戻る」ボタンでいつでも前の手順を確認できます。入力した値は入力次第自動的に保存されます。
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
        この補正プリントに利用したプリンターの特性を保存します。今後はこの特性を参照し、1軸のみの簡易補正を利用できます。  <br/>
        利用したプリンターを識別できる名前を入力してください。同じ機種を複数台持っている場合は、名前で個体を識別できるようにしてください。
      </p>
      <p class="truss-note">
        保存するデータはこのプリンター固有のもので、歪みなどの特性が変更されない限り有効です。<br/>
        今後歪み補正の変更やプリンターの分解整備によって印刷の寸法特性が変化した場合は、再度4軸補正を行ってください。
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
            「{props.name.trim()}」という名前のプリンターはすでに存在します。続行すると保存済みのプリンターは上書きされます。
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
        測定された収縮率： <strong>{props.shrinkage}</strong>
      </small>

      {props.app.active()!.quadSaveFailed && (
        <div class="truss-callout truss-callout-warning">
          <h3>プリンターの特性係数を保存できませんでした</h3>
          <p>
            ブラウザーのストレージが利用できないため、このプリンターの特性係数を保存されませんでした。
            後でプリンター管理メニューから追加できるよう、手動で控えておいてください：
          </p>
          <p class="truss-factor">
            <strong>{String(props.factor)}</strong>
          </p>
        </div>
      )}

      <h3>現在のフィラメント収縮設定を確認する</h3>
      <p>
        スライサーでフィラメントの設定を開き、現在のXY面の収縮値（OrcaSlicerの場合は「Shrinkage (XY)」、Bambu Studioの場合は「収縮」）を確認します。ほとんどの場合、初期値は100%です。 <br/>
        現在の収縮値を下の欄に入力してください。
      </p>
      <Figure src={img.shrinkageAdjust1JaOrca} alt="フィラメント設定（OrcaSlicer）" caption="OrcaSlicerのXY面収縮設定（「Shrinkage (XY)」 ）の場所" />
      <Figure src={img.shrinkageAdjust1JaBambu} alt="フィラメント設定（Bambu Studio）" caption="Bambu Studioの収縮設定の場所" />

      <div class="truss-field">
        <label for="quad-current-xy">現在のXY面の収縮設定（%）</label>
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
        上で計算された結果を、元の収縮値と同じ欄に貼り付けます。
        その後、フィラメントの設定を保存します。
      </p>
      <Figure src={img.shrinkageAdjust2JaOrca} alt="変更後の例（OrcaSlicer）" caption="変更後の例（OrcaSlicer）" />
      <Figure src={img.shrinkageAdjust2JaBambu} alt="変更後の例（Bambu Studio）" caption="変更後の例（Bambu Studio）" />

      <p>
        他のスライサーをご利用の場合、必要に応じて手順を変更してください。
      </p>
    </>
  )
}
