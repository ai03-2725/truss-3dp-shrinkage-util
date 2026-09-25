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
      <p>校正に使用する保存済みプリンターを選択してください。</p>

      {printers().length === 0 ? (
        <p class="truss-note">
          保存されたプリンターがありません。先にクアッドビーム校正を実行するか、プリンター管理
          メニューからプリンターを追加またはインポートしてください。
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

export function SingleSliceContent() {
  return (
    <>
      <p>
        シングルビーム校正モデルをダウンロードし、お使いのスライサーでスライスしてください。 <br/>
        このガイドはOrcaSlicer / Bambu Studioを対象としています。他のスライサーでは手順を適宜読み替えてください。
      </p>

      <p>
        <a class="button truss-icon-label" href={stl.single} download="Truss Calibration Beam Single.stl">
          <Icon svg={icons.downloadSimple} />
          シングル校正ビームをダウンロード（STL）
        </a>
      </p>

      <Figure src={img.trussSingle} alt="シングルTruss校正ビームの設計" caption="シングルビーム設計。" />
      <Figure src={img.slicedSingle} alt="スライサーでスライスされたシングルビーム" caption="測定面にシームを付けないでください。" />

      <h3>測定面にシームがないことを確認する</h3>
      <p>
        クアッドビーム校正フローと同様に、測定に使用する壁にシームが配置されていないことを確認してください。 <br/>
        必要に応じてシーム表示を有効にし、移動が必要なシームがあればシーム配置設定を調整するか、手動のシームペイントツールを使用してください。
      </p>
      <p>
        参考として、クアッドビーム設計の測定壁の位置を下に示します。シングルビームファイルでは、シングルビームの両端を確認してください。
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

export function SinglePrintContent() {
  return (
    <>
      <p>スライスしたファイルを印刷します。</p>
      <Figure src={img.printingSingle} alt="印刷中のシングルビーム" />
      <div class="truss-callout">
        <h3>プリントの取り外し</h3>
        <p>
          <strong>プリントをビルドプレートから無理に剥がさないでください</strong>。プリントが反り、
          測定値が無意味になるおそれがあります。 <br/>
          プリントが完全に冷えるまで待ってから、ビルドプレートから取り外してください。 <br/>
          <strong>ビルドプレートに付いたままのプリントを測定しないでください。</strong>
        </p>
      </div>
      <Figure src={img.singlePrinted} alt="完成し冷却されたシングルビームのプリント" />
    </>
  )
}

export function SingleMeasureContent(props: { app: AppApi; beam: BeamInput }) {
  return (
    <>
      <MeasurementWarnings />

      <p>梁を横断する次の2つの寸法（外側と内側）を測定します。</p>
      <p>必要に応じて画像をタップ/クリックして拡大し、さらにズームできます。</p>
      <div class="truss-image-grid">
        <Figure src={img.outerMeasurementSingle} alt="シングルビームの外側測定の図" caption="外側測定。" />
        <Figure src={img.singleMeasurementOuter} alt="ノギスによる外側測定の写真" />
        <Figure src={img.innerMeasurementSingle} alt="シングルビームの内側測定の図" caption="内側測定。" />
        <Figure src={img.singleMeasurementInner} alt="ノギスによる内側測定の写真" />
      </div>

      <InnerJawGuidance
        note={
          <p class="truss-note">
            これらの位置決め写真はクアッドビーム設計のものです。同じ注意事項がすべてのバリエーションに当てはまります。
          </p>
        }
      />
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
          保存済みのプリンターデータに基づく外摺収縮率：{' '}
          <strong>{props.shrinkage}</strong>
        </small>
      )}

      <h3>現在のフィラメントXY収縮設定を確認する</h3>
      <p>
        フィラメントの設定を開き、現在のXY収縮値を確認します。通常は100%が初期値です。 <br/>
        下に入力してください。  
      </p>
      <Figure src={img.shrinkageAdjust1} alt="フィラメント設定でXY収縮設定を確認する" caption="OrcaSlicer/Bambu StudioでのXY収縮の場所。" />

      <div class="truss-field">
        <label for="single-current-xy">スライサーでの現在のXY収縮率（%）</label>
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
        上で求めた更新後の収縮率を、元の収縮値を取得したのと同じ欄に貼り付けます。
      </p>
      <Figure src={img.shrinkageAdjust2} alt="計算された割合に調整されたXY収縮値" caption="更新後の割合の例。" />

      <p>
        他のスライサーでは、手順を適宜読み替えてください。
      </p>
    </>
  )
}
