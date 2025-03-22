import { TableService } from '@/app/core/service/table.service'
import { CommonModule } from '@angular/common'
import { Component, Input } from '@angular/core'
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap'
import type { Observable } from 'rxjs'

@Component({
    selector: 'app-table-footer',
    imports: [CommonModule, NgbPaginationModule],
    templateUrl: './table-footer.component.html',
    styles: `
      .badge {
        font-size: 0.85rem;
        padding: 0.5rem 0.75rem;
      }

      ::ng-deep .pagination {
        margin-bottom: 0;
        flex-wrap: wrap;
        justify-content: flex-end;
      }

      ::ng-deep .pagination .page-link {
        padding: 0.4rem 0.6rem;
        font-size: 0.85rem;
      }

      @media (max-width: 576px) {
        .d-flex.justify-content-end {
          justify-content: center !important;
        }
      }
    `
})
export class TableFooterComponent {
  @Input() total!: Observable<number>

  constructor(public tableService: TableService<any>) {}
}
