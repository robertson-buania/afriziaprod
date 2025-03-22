import { TableService } from '@/app/core/service/table.service'
import { CommonModule } from '@angular/common'
import { Component } from '@angular/core'
import { FormsModule } from '@angular/forms'

@Component({
    selector: 'app-table-header',
    imports: [CommonModule, FormsModule],
    templateUrl: './table-header.component.html',
    styles: `
      .search-bar {
        min-width: 220px;
      }

      @media (max-width: 768px) {
        .d-flex.flex-wrap {
          gap: 1rem !important;
        }

        .d-flex.flex-wrap > div {
          width: 100%;
        }

        .search-bar {
          width: 100%;
        }
      }
    `
})
export class TableHeaderComponent {
  constructor(public tableService: TableService<any>) {}
}
