// Japanese page content for the Single flow. Each step's prose and figures can be
// reordered independently; gating, navigation, and calculations come from the
// shared containers in ../single.tsx.
import { For } from 'solid-js'
import type { AppApi } from '../../lib/app-api.ts'
import type { BeamInput } from '../../lib/types.ts'
import { BeamFields } from '../../components/BeamFields.tsx'
import { Figure, InnerJawGuidance, MeasurementWarnings } from '../../components/Guide.tsx'
import { Icon } from '../../components/Icon.tsx'
import { ResultPercent } from '../../components/ResultPercent.tsx'
import { icons } from '../../lib/icons.ts'
import { messages } from '../../lib/messages.ts'
import { img, stl } from '../../lib/assets.ts'

export function SinglePrinterContent(props: { app: AppApi }) {
  const selected = () => props.app.active()!.selectedPrinterName
  const printers = () => props.app.printers()

  return (
    <>
      <p>補正に使用するプリンターを選択してください。</p>

      {printers().length === 0 ? (
        <p class="truss-note">
          保存されたプリンターがありません。先に4軸補正を実行するか、プリンター管理
          メニューからプリンターを手動で追加してください。
        </p>
      ) : (
        <fieldset class="truss-printer-picker">
          <For each={printers()}>
            {(printer) => (
              <label class="truss-radio">
                <input
                  type="radio"
                  name="truss-single-printer"
                  value={printer.name}
                  checked={selected() === printer.name}
                  onChange={() => props.app.selectPrinter(printer.name)}
                />
                <span>{printer.name}</span>
              </label>
            )}
          </For>
        </fieldset>
      )}
    </>
  )
}

export function SingleFilamentContent(props: { app: AppApi }) {
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

export function SingleSliceContent() {
  return (
    <>
      <p>
        1軸補正の3Dモデルをダウンロードし、お使いのスライサーでスライスしてください。 <br/>
        このガイドはOrcaSlicer / Bambu Studioを対象としています。他のスライサーをご利用の場合、必要に応じて手順を変更してください。
      </p>

      <p>
        <a class="button truss-icon-label" href={stl.single} download="Truss Calibration Beam Single.stl">
          <Icon svg={icons.downloadSimple} />
          1軸補正用モデルをダウンロード（Truss Calibration Beam Single.stl）
        </a>
      </p>

      <Figure src={img.trussSingle} alt="1軸補正モデル" caption="1軸補正モデル" />
      <Figure src={img.slicedSingle} alt="スライス後" caption="スライス後" />

      <h3>測定面に継ぎ目がないことを確認する</h3>
      <p>
        4軸補正と同様に、測定に使用する壁にシームが配置されていないことを確認してください。 <br/>
        スライス後のプレビュー画面で継ぎ目表示を有効にし、必要であれば継ぎ目位置の設定の調整または手動の継ぎ目ペイントツールを使用してください。
      </p>
      <p>
        参考に4軸補正モデルの測定面の位置を表示してします。1軸補正モデルでは、両端の計4つの測定面を確認してください。
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

export function SinglePrintContent() {
  return (
    <>
      <p>スライスしたファイルを印刷します。</p>
      <Figure src={img.printingSingle} alt="印刷中の1軸モデル" />
      <div class="truss-callout">
        <h3>造形物の取り外し</h3>
        <p>
          <strong>造形物をビルドプレートから無理やり剥がさないでください</strong>。造形物が反ってしまい、測定値が無効になるおそれがあります。 <br/>
          造形物が完全に冷えるまで待ってから、ビルドプレートから慎重に取り外してください。 <br/>
          <strong>ビルドプレートに付いた状態のまま測定を行わないでください。</strong>
        </p>
      </div>
      <Figure src={img.singlePrinted} alt="取り外し後の造形物" />
    </>
  )
}

export function SingleMeasureContent(props: { app: AppApi; beam: BeamInput }) {
  return (
    <>
      <MeasurementWarnings />

      <p>梁の2つの計測点（外側と内側）を測定します。</p>
      <p>必要に応じて画像をタップ/クリックし、拡大してご確認ください。</p>
      <div class="truss-image-grid">
        <Figure src={img.outerMeasurementSingle} alt="X外側測定の図" caption="外側の測定用の面" />
        <Figure src={img.singleMeasurementOuter} alt="ノギスによる外側の面の測定" />
        <Figure src={img.innerMeasurementSingle} alt="X内側測定の図" caption="内側の測定用の面" />
        <Figure src={img.singleMeasurementInner} alt="ノギスによる内側の面の測定" />
      </div>

      <InnerJawGuidance
        note={
          <p class="truss-note">
            写真は4軸測定用モデルのものですが、1軸測定用モデルの測定方法も同様です。
          </p>
        }
      />
      <p>注意点を踏まえて寸法し、測定値をを入力してください。 </p>
      <BeamFields
        idPrefix="single-x"
        legend="X梁"
        beam={props.beam}
        onChange={(patch) => props.app.updateSingleBeam(patch)}
      />
    </>
  )
}

export function SingleResultContent(props: {
  app: AppApi
  missingPrinter: boolean
  shrinkage: string | null
  recommendedPercent: string | null
  currentValid: boolean
  percentWarning: boolean
}) {
  const active = () => props.app.active()!
  const t = () => messages(props.app.locale())

  return (
    <>
      {props.missingPrinter ? (
        <p class="truss-error" role="alert">
          選択したプリンターが見つかりませんでした。戻って別の保存済みプリンターを選択してください。
        </p>
      ) : (
        <small>
          保存済みのプリンター特性係数に基づく外挿収縮率：
          <strong>{props.shrinkage}</strong>
        </small>
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
          id="single-current-xy"
          type="text"
          inputmode="decimal"
          autocomplete="off"
          value={active().single.currentXY}
          aria-describedby={
            [
              props.percentWarning ? 'single-current-xy-warning' : '',
              !props.currentValid ? 'single-current-xy-error' : '',
            ]
              .filter(Boolean)
              .join(' ') || undefined
          }
          onInput={(event) => props.app.updateSingle({ currentXY: event.currentTarget.value })}
        />
        {props.percentWarning && (
          <p id="single-current-xy-warning" class="truss-warning" role="status">
            {t().percentRangeWarning}
          </p>
        )}
        {!props.currentValid && (
          <p id="single-current-xy-error" class="truss-error" role="alert">
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
