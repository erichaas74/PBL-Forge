import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DRAGON_TRAITS, phenotypeLabel, showsDominantPhenotype } from '../domain/dragon-inheritance';
import { DragonParentProfile } from '../domain/dragon-lab.models';

@Component({
  selector: 'app-dragon-portrait',
  template: `
    <div
      class="portrait"
      [style.--dragon-color]="profile().color"
      [style.--dragon-accent]="profile().accentColor"
      [attr.aria-label]="profile().name + ' phenotype portrait'"
      role="img">
      <div class="moon"></div>
      @if (winged()) {
        <div class="wing wing-left"></div>
        <div class="wing wing-right"></div>
      }
      <div class="tail"></div>
      <div class="body">
        @if (spotted()) {
          <i class="spot spot-one"></i><i class="spot spot-two"></i><i class="spot spot-three"></i>
        }
      </div>
      <div class="neck"></div>
      <div class="head">
        <i class="eye"></i>
        @if (horned()) { <i class="horn horn-one"></i><i class="horn horn-two"></i> }
      </div>
      <div class="leg leg-one"></div><div class="leg leg-two"></div>
      @if (fireBreathing()) { <div class="fire">◆</div> }
    </div>
    <div class="phenotype-row" aria-label="Observable phenotypes">
      @for (trait of traits; track trait.id) {
        <span>{{ phenotype(trait.id) }}</span>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .portrait { --dragon-color: #6b8f71; --dragon-accent: #c6e0b4; position: relative; height: 148px; overflow: hidden; border-radius: 18px; background: linear-gradient(160deg, #17223b, #2e4163); }
    .moon { position: absolute; width: 62px; height: 62px; right: 13px; top: 12px; border-radius: 50%; background: #fff3c5; opacity: .82; box-shadow: 0 0 28px #ffeaa766; }
    .body, .head, .neck, .leg, .tail, .wing { position: absolute; background: var(--dragon-color); }
    .body { width: 78px; height: 52px; left: calc(50% - 38px); bottom: 31px; border-radius: 52% 48% 45% 50%; z-index: 3; }
    .neck { width: 22px; height: 49px; left: calc(50% + 21px); bottom: 62px; transform: rotate(-24deg); border-radius: 12px; z-index: 2; }
    .head { width: 45px; height: 31px; left: calc(50% + 32px); bottom: 91px; border-radius: 55% 65% 45% 50%; z-index: 4; }
    .head::after { content: ''; position: absolute; width: 20px; height: 11px; right: -10px; bottom: 2px; border-radius: 2px 10px 10px 7px; background: var(--dragon-color); }
    .eye { position: absolute; width: 5px; height: 5px; right: 9px; top: 7px; border-radius: 50%; background: #ffe66d; box-shadow: 0 0 0 2px #1d2330; }
    .leg { width: 12px; height: 35px; bottom: 13px; border-radius: 4px 4px 9px 9px; z-index: 2; }
    .leg-one { left: calc(50% - 24px); transform: rotate(7deg); }
    .leg-two { left: calc(50% + 17px); transform: rotate(-8deg); }
    .tail { width: 77px; height: 16px; left: calc(50% - 96px); bottom: 48px; transform: rotate(12deg); transform-origin: right; border-radius: 90% 10% 20% 90%; z-index: 2; }
    .wing { width: 65px; height: 55px; left: calc(50% - 40px); bottom: 69px; transform-origin: right bottom; clip-path: polygon(100% 100%, 0 76%, 19% 0, 48% 55%, 68% 13%); background: var(--dragon-accent); opacity: .92; z-index: 1; }
    .wing-left { transform: rotate(-15deg); }
    .wing-right { transform: scaleX(-1) rotate(-24deg); left: calc(50% - 7px); opacity: .72; }
    .horn { position: absolute; width: 13px; height: 20px; top: -13px; background: #f5d791; clip-path: polygon(50% 0, 100% 100%, 0 100%); z-index: -1; }
    .horn-one { left: 8px; transform: rotate(-18deg); }
    .horn-two { left: 22px; top: -11px; }
    .fire { position: absolute; left: calc(50% + 91px); bottom: 91px; color: #ffcc32; font-size: 27px; transform: rotate(45deg); text-shadow: -7px 7px 0 #ff6534; animation: flicker 1.1s ease-in-out infinite alternate; }
    .spot { position: absolute; width: 10px; height: 7px; border-radius: 50%; background: var(--dragon-accent); opacity: .9; }
    .spot-one { left: 17px; top: 12px; }.spot-two { left: 41px; top: 28px; }.spot-three { left: 57px; top: 10px; }
    .phenotype-row { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px; }
    .phenotype-row span { padding: 3px 7px; border-radius: 999px; background: #edf2f7; color: #35435d; font-size: .7rem; line-height: 1.2; }
    @keyframes flicker { from { transform: rotate(45deg) scale(.82); opacity: .75; } to { transform: rotate(45deg) scale(1.08); opacity: 1; } }
    @media (prefers-reduced-motion: reduce) { .fire { animation: none; } }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DragonPortraitComponent {
  readonly profile = input.required<DragonParentProfile>();
  readonly traits = DRAGON_TRAITS;
  readonly winged = computed(() => this.hasDominant('wings'));
  readonly fireBreathing = computed(() => this.hasDominant('fire'));
  readonly spotted = computed(() => this.hasDominant('scales'));
  readonly horned = computed(() => this.hasDominant('horns'));

  phenotype(traitId: typeof DRAGON_TRAITS[number]['id']): string {
    return phenotypeLabel(this.profile(), traitId);
  }

  private hasDominant(traitId: typeof DRAGON_TRAITS[number]['id']): boolean {
    return showsDominantPhenotype(this.profile().genome[traitId], traitId);
  }
}
