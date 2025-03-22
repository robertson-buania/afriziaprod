import { currentYear } from '@/app/common/constants'
import { Component } from '@angular/core'

@Component({
    selector: 'task-state',
    imports: [],
    templateUrl: './task-state.component.html',
    styles: ``
})
export class TaskStateComponent {
  currentYear = currentYear
}
