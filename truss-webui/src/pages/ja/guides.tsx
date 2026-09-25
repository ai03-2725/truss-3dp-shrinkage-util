// Japanese formatted guidance shared by both flows. Paragraph order and figure
// placement may differ per locale; behavior is unaffected.
import type { JSX } from 'solid-js'
import { img } from '../../lib/assets.ts'
import { Figure } from '../../components/Figure.tsx'

// Shared caliper cautions used by both flows' measurement screens.
export function MeasurementWarningsContent() {
  return (
    <div class="truss-callout">
      <h3>測定の前に</h3>
      <ol>
        <li>
          <strong>ノギスで過剰な力を加えないでください。</strong>Trussキャリブレーターは可能な限り
          乱暴な扱いに耐えるよう設計されていますが、3Dプリントされたプラスチックはすべて弾性があります。
          過剰な力を加えるとプリントが変形し、実際に印刷された寸法より大きくも小さくも測定されてしまいます。 <br/>
          理想的にはノギスがまったく力を加えない状態にしてください。クランプ側から手を離し、必要なら
          プリントがノギスを押し戻すようにします。ノギスにサムホイール式のローラーがある場合、
          それを使って過剰な力を加えないでください。
        </li>
        <li>
          <strong>測定する寸法と平行に測ってください。</strong>ノギスが大きく傾いていると、
          寸法を正しく測定できません。
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
      <h3>内側寸法の測定</h3>
      <p>
        以下に説明するように、ノギスが正しく位置決めされていることを確認してください。
      </p>
      {props.note}

      <h4>正しい例</h4>
      <ul>
        <li>
          ノギスは<strong>プリントの上面</strong>から差し込みます。
          <Figure src={img.caliperEnterTop} alt="ノギスをプリントの上面から差し込む" />
        </li>
        <li>
          ノギスの<strong>平らな内側の面を、梁の途中にある支持壁に密着</strong>させます。
          <Figure
            src={img.innerCorrect1}
            alt="一方の端で、ノギスの内側ジョーを支持壁に密着させる"
          />
        </li>
        <li>
          ノギスの<strong>両端</strong>で同様にします（片側を位置決めしている間に、もう片側が
          ずれないよう注意してください）。
          <Figure
            src={img.innerCorrect2}
            alt="もう一方の端で、ノギスの内側ジョーを支持壁に密着させる"
          />
        </li>
      </ul>

      <h4>誤った例</h4>
      <ul>
        <li>
          誤り：ノギスの内側の平面が支持壁に接触していません。この場合、実際に印刷された
          寸法より長い対角線の測定値になります。
          <Figure
            src={img.calipersIncorrectGap}
            alt="ジョーと壁の間に隙間がある誤った内側測定"
          />
        </li>
        <li>
          誤り：ノギスをプリントの下面から使用しています。ノギスの先端の斜めの面を、
          中央の支持壁に向けてはいけません。
          <Figure
            src={img.calipersIncorrectSide}
            alt="プリントの下面から行った誤った内側測定"
          />
        </li>
      </ul>
    </div>
  )
}
