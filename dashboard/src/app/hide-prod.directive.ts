import { Directive, ViewContainerRef, OnInit, TemplateRef } from '@angular/core';
import { environment } from '../environments/environment';

/**
 * usage: <div *hideProd></div>
 */
@Directive({
  selector: '[hideProd]'
})
export class HideProdDirective implements OnInit{

  constructor(private templateRef: TemplateRef<any>, private viewContainerRef: ViewContainerRef) { }

  ngOnInit(): void {
    if(!environment.production)
      this.viewContainerRef.createEmbeddedView(this.templateRef);
  }

}