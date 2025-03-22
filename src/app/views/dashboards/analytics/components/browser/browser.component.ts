import { Component } from '@angular/core'
import { BrowserData } from '../../data'

@Component({
    selector: 'analytics-browser',
    imports: [],
    templateUrl: './browser.component.html',
    styles: ``
})
export class BrowserComponent {
  BrowserData = BrowserData
}
