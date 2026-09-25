// Japanese formatted guidance shared by both flows. Paragraph order and figure
// placement may differ per locale; behavior is unaffected.
import type { JSX } from 'solid-js'
import { img } from '../../lib/assets.ts'
import { Figure } from '../../components/Figure.tsx'

// Shared caliper cautions used by both flows' measurement screens.
export function MeasurementWarningsContent() {
  return (
    <div class="truss-callout">
      <h3>測定する際の注意点</h3>
      <ol>
        <li>
          <strong>ノギスで過度な力を加えないでください。</strong><br/>
          Trussはある程度の圧力に耐えるよう設計されていますが、プラスチックには弾性があります。過度な力を加えるとプリントが変形し、計測する寸法が変化してしまう可能性があります。 <br/>
          可能であればノギスがプリントにまったく圧を加えていない状態で計測してください。ノギスにサムローラーが付いている場合、計測中にサムローラーで力を加えないでください。
        </li>
        <li>
          <strong>測定する寸法と平行に測ってください。</strong><br/>
          ノギスが大きく傾いている場合、寸法を正しく測定できません。
        </li>
      </ol>
    </div>
  )
}

// Inner-jaw orientation guidance; the photos are from the Quad design but apply
// to every variant.
export function InnerJawGuidanceContent(props: { note?: JSX.Element }) {
  return (
    <div class="truss-guidance">
      <h3>内側の寸法の測定方法</h3>
      <p>
        内側の寸法を計測する際、ノギスが正しい位置にあることを確認してください。
      </p>
      {props.note}

      <h4>正しい例</h4>
      <ul>
        <li>
          ノギスは<strong>プリントの上面</strong>から差し込みます。
          <Figure src={img.caliperEnterTop} alt="ノギスをプリントの上面から差し込む" />
        </li>
        <li>
          ノギスの<strong>平らな内側の面を、梁の中間にある支持面に密着</strong>させます。
          <Figure
            src={img.innerCorrect1}
            alt="一方の端で、ノギスの内側ジョーを支持壁に密着させる"
          />
        </li>
        <li>
          ノギスの<strong>両端</strong>が同様に配置してあることを確認します。（片側の調整中に、もう片側がずれないよう注意してください）
          <Figure
            src={img.innerCorrect2}
            alt="もう一方の端で、ノギスの内側ジョーを支持壁に密着させる"
          />
        </li>
      </ul>

      <h4>誤った例</h4>
      <ul>
        <li>
          ノギスの位置のミス：ノギスの内側の平面が支持壁に接触していません。この場合、測定したい寸法より長い対角線の測定値になります。
          <Figure
            src={img.calipersIncorrectGap}
            alt="ジョーと壁の間に隙間がある誤った内側測定"
          />
        </li>
        <li>
          利用面のミス：ノギスをプリントの下面から差し込んでしています。ノギスの外側の斜めの面が中央の支持面に向いてしまっています。
          <Figure
            src={img.calipersIncorrectSide}
            alt="プリントの下面から行った誤った内側測定"
          />
        </li>
      </ul>
    </div>
  )
}
