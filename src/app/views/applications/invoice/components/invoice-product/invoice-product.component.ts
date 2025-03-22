import { Component } from '@angular/core'
import { InvoiceData } from '../../data'
import { currency } from '@/app/common/constants'
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap'

@Component({
    selector: 'invoice-product',
    imports: [NgbPaginationModule],
    templateUrl: './invoice-product.component.html',
    styles: ``
})
export class InvoiceProductComponent {
  productList = InvoiceData
  currency = currency

  // Pagination configuration
  page = 1
  pageSize = 2
  collectionSize = InvoiceData.length

  // Computed property to get the current page items
  get paginatedProducts() {
    const startItem = (this.page - 1) * this.pageSize
    const endItem = startItem + this.pageSize
    return this.productList.slice(startItem, endItem)
  }
}
