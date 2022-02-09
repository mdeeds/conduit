import * as THREE from "three";

export interface Selectable {
  select(): void;
  deselect(): void;
  getObject3D(): THREE.Object3D;

  change(amount: number);
  trigger();
  release();
}

export type SelectionChangeCallback = (previous: Selectable, current: Selectable) => void;

export class Selection {
  private selectables: Selectable[] = [];
  private selected: Selectable = null;
  private callbacks: SelectionChangeCallback[] = [];
  constructor() { }

  private p = new THREE.Vector3();
  public select(ray: THREE.Ray) {
    let closestDistance = 1e9;
    let closestSelectable = null;
    for (const selectable of this.selectables) {
      selectable.getObject3D().getWorldPosition(this.p);
      const distance = ray.distanceToPoint(this.p);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestSelectable = selectable;
      }
    }
    if (this.selected == closestSelectable) {
      return;
    }
    for (const cb of this.callbacks) {
      cb(this.selected, closestSelectable);
    }
    if (this.selected) {
      this.selected.deselect();
    }
    this.selected = closestSelectable;
    this.selected.select();
  }

  public add(selectable: Selectable) {
    this.selectables.push(selectable);
  }

  public addChangeListener(cb: SelectionChangeCallback) {
    this.callbacks.push(cb);
  }

  public getSelected() {
    return this.selected;
  }
}