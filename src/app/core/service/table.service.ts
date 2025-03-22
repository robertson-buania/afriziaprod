import { DecimalPipe } from '@angular/common'
import { inject, Injectable } from '@angular/core'
import { BehaviorSubject, Observable, Subject } from 'rxjs'
import { debounceTime, switchMap, tap } from 'rxjs/operators'
import type { SortDirection } from '../directive/sortable.directive'

interface SearchResult<T> {
  items: T[]
  total: number
}

@Injectable({
  providedIn: 'root',
})
export class TableService<T> {
  private _loading$ = new BehaviorSubject<boolean>(true)
  private _search$ = new Subject<void>()
  private _items$ = new BehaviorSubject<T[]>([])
  private _total$ = new BehaviorSubject<number>(0)
  private _pageSize = new BehaviorSubject<number>(10)
  private _currentPage = new BehaviorSubject<number>(1)
  private _startIndex = new BehaviorSubject<number>(0)
  private _endIndex = new BehaviorSubject<number>(0)
  private _sortColumn = new BehaviorSubject<keyof T | ''>('' as keyof T | '')
  private _sortDirection = new BehaviorSubject<string>('')
  private _searchTerm = new BehaviorSubject<string>('')
  private _originalItems: T[] = []

  items$ = this._items$.asObservable()
  total$ = this._total$.asObservable()
  loading$ = this._loading$.asObservable()
  pageSize$ = this._pageSize.asObservable()
  currentPage$ = this._currentPage.asObservable()
  startIndex$ = this._startIndex.asObservable()
  endIndex$ = this._endIndex.asObservable()
  searchTerm$ = this._searchTerm.asObservable()

  public pipe = inject(DecimalPipe)

  constructor() {
    this._search$
      .pipe(
        tap(() => this._loading$.next(true)),
        debounceTime(200),
        switchMap(() => this._search()),
        tap(() => this._loading$.next(false))
      )
      .subscribe((result) => {
        this._items$.next(result.items)
        this._total$.next(result.total)
      })
  }

  get page() {
    return this._currentPage.value
  }

  get pageSize() {
    return this._pageSize.value
  }

  get searchTerm() {
    return this._searchTerm.value
  }

  get sortColumn() {
    return this._sortColumn.value
  }

  get sortDirection() {
    return this._sortDirection.value
  }

  get startIndex() {
    return this._startIndex.value
  }

  get endIndex() {
    return this._endIndex.value
  }

  set page(page: number) {
    this._currentPage.next(page)
    this.updatePage()
  }

  set pageSize(pageSize: number) {
    this._pageSize.next(pageSize)
    this.updatePage()
  }

  set searchTerm(searchTerm: string) {
    this._searchTerm.next(searchTerm)
    this.updatePage()
  }

  set sortColumn(sortColumn: keyof T | '') {
    this._sortColumn.next(sortColumn)
    this.updatePage()
  }

  set sortDirection(sortDirection: string) {
    this._sortDirection.next(sortDirection)
    this.updatePage()
  }

  setItems(items: T[], pageSize: number = 10) {
    this._originalItems = [...items]
    this._pageSize.next(pageSize)
    this._total$.next(items.length)
    this._items$.next(items)
    this._currentPage.next(1)
    this.updatePage()
  }

  private updatePage() {
    let items = [...this._originalItems]

    // Appliquer la recherche
    if (this.searchTerm) {
      items = items.filter(item =>
        Object.values(item as any).some(value =>
          value?.toString().toLowerCase().includes(this.searchTerm.toLowerCase())
        )
      )
    }

    // Mettre à jour le total avec le nombre d'éléments après filtrage
    const totalFiltered = items.length
    this._total$.next(totalFiltered)

    // Appliquer le tri
    if (this.sortColumn && this.sortDirection) {
      items.sort((a, b) => {
        const valueA = (a[this.sortColumn as keyof T] as any) || ''
        const valueB = (b[this.sortColumn as keyof T] as any) || ''

        if (valueA < valueB) {
          return this.sortDirection === 'asc' ? -1 : 1
        }
        if (valueA > valueB) {
          return this.sortDirection === 'asc' ? 1 : -1
        }
        return 0
      })
    }

    // Appliquer la pagination
    const pageSize = this._pageSize.value
    const currentPage = this._currentPage.value
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = Math.min(startIndex + pageSize, totalFiltered)

    this._startIndex.next(startIndex)
    this._endIndex.next(endIndex)

    // Mettre à jour les éléments paginés
    this._items$.next(items.slice(startIndex, endIndex))
  }

  private _search(): Observable<SearchResult<T>> {
    let items = [...this._originalItems]

    // Appliquer le filtre
    if (this.searchTerm) {
      items = this._filter(items, this.searchTerm)
    }

    // 2. Trier
    if (this.sortColumn && this.sortDirection) {
      items = this._sort(items, this.sortColumn, this.sortDirection)
    }

    // 3. Paginer
    const total = items.length
    const startIndex = (this.page - 1) * this.pageSize
    const endIndex = Math.min(startIndex + this.pageSize, total)
    items = items.slice(startIndex, endIndex)

    return new Observable<SearchResult<T>>((subscriber) => {
      subscriber.next({
        items,
        total,
      })
      subscriber.complete()
    })
  }

  private _filter(items: T[], term: string): T[] {
    if (!term) {
      return items
    }

    return items.filter((item) => {
      if (!item) return false
      const values = Object.values(item as object).map((value) =>
        value?.toString().toLowerCase() || ''
      )
      return values.some((value) => value.includes(term.toLowerCase()))
    })
  }

  private _sort(items: T[], column: keyof T, direction: string): T[] {
    if (!column || !direction) {
      return items
    }

    return [...items].sort((a, b) => {
      if (!a || !b) return 0
      const aValue = (a[column] as any)?.toString().toLowerCase() || ''
      const bValue = (b[column] as any)?.toString().toLowerCase() || ''

      if (direction === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else if (direction === 'desc') {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
      return 0
    })
  }

  setPage(page: number): void {
    this.page = page;
  }

  resetItems() {
    this._items$.next([...this._originalItems]);
    this._total$.next(this._originalItems.length);
    this.updatePage();
  }

  setSearchTerm(term: string) {
    this.searchTerm = term;
    this.updatePaginatedItems();
  }

  private updatePaginatedItems() {
    const filtered = this._filter(this._originalItems, this.searchTerm);
    const total = filtered.length;

    this._total$.next(total);

    const startIndex = (this.page - 1) * this.pageSize;
    const endIndex = Math.min(startIndex + this.pageSize, total);

    this._items$.next(filtered.slice(startIndex, endIndex));
  }
}
