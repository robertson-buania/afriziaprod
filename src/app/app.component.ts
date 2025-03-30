import { Component, inject, ViewChild, OnInit, OnDestroy } from '@angular/core'
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  RouterOutlet,
  Router,
  type Event,
} from '@angular/router'
import { TitleService } from './core/service/title.service'
import {
  NgProgressComponent,
  NgProgressModule,
  type NgProgressRef,
} from 'ngx-progressbar'
import { CommonModule } from '@angular/common'
import { Subscription } from 'rxjs'
import { AuthModalComponent } from './views/website/components/auth-modal/auth-modal.component'
import { AuthModalModule } from './views/website/components/auth-modal/auth-modal.module'
import { AuthModalService, AuthModalType } from './core/services/auth-modal.service'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [CommonModule, RouterOutlet, NgProgressModule, AuthModalModule],
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {
  startedClass = false
  progressRef!: NgProgressRef
  @ViewChild(NgProgressComponent) progressBar!: NgProgressComponent
  private subscription = new Subscription();

  private titleService = inject(TitleService)
  private router = inject(Router)
  private authModalService = inject(AuthModalService)
  private modalService = inject(NgbModal)

  constructor() {
    this.router.events.subscribe((event: Event) => {
      this.checkRouteChange(event)
    })
  }

  ngOnInit(): void {
    this.titleService.init();

    // S'abonner aux demandes d'ouverture de modal d'authentification
    this.subscription.add(
      this.authModalService.modalType$.subscribe(modalType => {
        this.ouvrirModal(modalType);
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private ouvrirModal(type: AuthModalType): void {
    // Fermer tous les modals existants pour éviter l'empilement
    this.modalService.dismissAll();

    // Ouvrir le nouveau modal
    const modalRef = this.modalService.open(AuthModalComponent, {
      centered: true,
      backdrop: 'static',
      keyboard: false,
      size: 'lg',
      windowClass: 'auth-modal'
    });

    // Définir l'onglet actif en fonction du type de modal
    modalRef.componentInstance.activeTab = type === AuthModalType.LOGIN ? 1 :
                                         type === AuthModalType.REGISTER ? 2 : 3;
  }

  // show Loader when route change
  checkRouteChange(routerEvent: Event) {
    if (routerEvent instanceof NavigationStart) {
      this.progressBar.start()
    }
    if (
      routerEvent instanceof NavigationEnd ||
      routerEvent instanceof NavigationCancel ||
      routerEvent instanceof NavigationError
    ) {
      setTimeout(() => {
        this.progressBar.complete()
      }, 200)
    }
  }
}
