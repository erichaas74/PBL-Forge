import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  DRAGON_TRAITS,
  showsDominantPhenotype,
} from './simulation/domain/dragon-inheritance';
import { DragonParentProfile } from './simulation/domain/dragon-lab.models';

@Component({
  selector: 'app-dragon-portrait',
  template: `
    <div
      class="portrait"
      [class.compact]="compact()"
      [style.--dragon-color]="profile().color"
      [style.--dragon-accent]="profile().accentColor"
      [attr.aria-label]="profile().name + ' phenotype portrait'"
      role="img">
      <div class="moon"></div>
      @if (winged()) {
        <div class="wing wing-left"></div><div class="wing wing-right"></div>
      }
      <div class="tail"></div>
      <div class="body">
        @if (spotted()) { <i class="spot one"></i><i class="spot two"></i><i class="spot three"></i> }
      </div>
      <div class="neck"></div><div class="head"><i class="eye"></i>
        @if (horned()) { <i class="horn horn-one"></i><i class="horn horn-two"></i> }
      </div>
      <div class="leg leg-one"></div><div class="leg leg-two"></div>
      @if (fireBreathing()) { <div class="fire"><i></i><i></i><i></i></div> }
      <span class="nameplate">{{ profile().name }}</span>
    </div>
  `,
  styles: [`
    :host { display: block; min-width: 0; }
    .portrait { --dragon-color: #7c8f71; --dragon-accent: #c8e09f; position: relative; height: 180px; overflow: hidden; border-radius: 18px; background: radial-gradient(circle at 75% 20%, #fff1b8 0 12%, transparent 13%), linear-gradient(155deg, #19233b, #324663 65%, #755c63); box-shadow: inset 0 -28px 60px rgb(0 0 0 / 20%); }
    .portrait.compact { height: 128px; }
    .moon { position: absolute; right: 16%; top: 13%; width: 1px; height: 1px; box-shadow: 18px 6px 0 #fff7d4, -20px 22px 0 #fff7d4, 8px 43px 0 #fff7d4, -50px 4px 0 #fff7d4; }
    .body, .head, .neck, .leg, .tail, .wing { position: absolute; background: var(--dragon-color); }
    .body { z-index: 3; left: calc(50% - 44px); bottom: 37px; width: 90px; height: 57px; border-radius: 52% 48% 45% 50%; box-shadow: inset -9px -8px 0 rgb(0 0 0 / 12%); }
    .compact .body { transform: scale(.8); transform-origin: bottom; }
    .neck { z-index: 2; left: calc(50% + 25px); bottom: 71px; width: 24px; height: 57px; transform: rotate(-24deg); border-radius: 12px; }
    .head { z-index: 4; left: calc(50% + 40px); bottom: 108px; width: 52px; height: 34px; border-radius: 55% 65% 45% 50%; }
    .head::after { content: ''; position: absolute; right: -12px; bottom: 1px; width: 24px; height: 13px; border-radius: 2px 11px 11px 7px; background: var(--dragon-color); }
    .compact .neck { bottom: 45px; transform: rotate(-24deg) scale(.78); }.compact .head { bottom: 73px; transform: scale(.78); }.compact .tail { bottom: 35px; transform: rotate(12deg) scale(.8); }.compact .leg { bottom: 15px; height: 25px; }
    .eye { position: absolute; right: 10px; top: 8px; width: 6px; height: 6px; border: 2px solid #182235; border-radius: 50%; background: #ffe66d; }
    .leg { z-index: 2; bottom: 16px; width: 13px; height: 38px; border-radius: 4px 4px 9px 9px; }.leg-one { left: calc(50% - 28px); transform: rotate(7deg); }.leg-two { left: calc(50% + 20px); transform: rotate(-8deg); }
    .tail { z-index: 2; left: calc(50% - 112px); bottom: 53px; width: 88px; height: 17px; transform: rotate(12deg); transform-origin: right; border-radius: 90% 10% 20% 90%; }
    .wing { z-index: 1; left: calc(50% - 48px); bottom: 78px; width: 76px; height: 67px; transform-origin: right bottom; clip-path: polygon(100% 100%, 0 76%, 19% 0, 48% 55%, 68% 13%); background: var(--dragon-accent); opacity: .95; }.wing-left { transform: rotate(-15deg); }.wing-right { left: calc(50% - 7px); transform: scaleX(-1) rotate(-24deg); opacity: .68; }
    .compact .wing { bottom: 55px; transform: rotate(-15deg) scale(.76); }.compact .wing-right { transform: scaleX(-1) rotate(-24deg) scale(.76); }
    .horn { position: absolute; z-index: -1; top: -15px; width: 14px; height: 22px; clip-path: polygon(50% 0, 100% 100%, 0 100%); background: #f5d791; }.horn-one { left: 9px; transform: rotate(-18deg); }.horn-two { left: 26px; top: -12px; }
    .fire { position: absolute; z-index: 5; left: calc(50% + 106px); bottom: 105px; display: flex; gap: 1px; transform: rotate(-12deg); }.fire i { display: block; width: 16px; height: 10px; clip-path: polygon(0 50%, 100% 0, 75% 50%, 100% 100%); background: #ffc83d; }.fire i:nth-child(2) { background: #ff773d; transform: scale(.8); }.fire i:nth-child(3) { background: #ffd95c; transform: scale(.55); }
    .compact .fire { left: calc(50% + 78px); bottom: 73px; transform: rotate(-12deg) scale(.75); }
    .spot { position: absolute; width: 11px; height: 8px; border-radius: 50%; background: var(--dragon-accent); }.spot.one { left: 19px; top: 12px; }.spot.two { left: 46px; top: 30px; }.spot.three { left: 65px; top: 11px; }
    .nameplate { position: absolute; z-index: 6; left: 10px; bottom: 9px; padding: 4px 8px; border-radius: 999px; background: rgb(8 16 28 / 66%); color: white; font-size: .7rem; font-weight: 800; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DragonPortraitComponent {
  readonly profile = input.required<DragonParentProfile>();
  readonly compact = input(false);
  readonly winged = computed(() => this.hasDominant('wings'));
  readonly fireBreathing = computed(() => this.hasDominant('fire'));
  readonly spotted = computed(() => this.hasDominant('scales'));
  readonly horned = computed(() => this.hasDominant('horns'));

  private hasDominant(traitId: typeof DRAGON_TRAITS[number]['id']): boolean {
    return showsDominantPhenotype(this.profile().genome[traitId], traitId);
  }
}
