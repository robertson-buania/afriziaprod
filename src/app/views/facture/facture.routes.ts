import { Route } from "@angular/router";
import { FactureListComponent } from "./facture-list/facture-list.component";
import { FactureNewComponent } from "./facture-new/facture-new.component";



export const FACTURE_ROUTES: Route[] = [
  {
    path: 'list',
    component: FactureListComponent,
    data: { title: 'Liste factures' },
  },
  {
    path: 'new',
    component: FactureNewComponent,
    data: { title: 'Nouvelle facture' },
  },
  // {
  //   path: 'project',
  //   component: ProjectComponent,
  //   data: { title: 'Project' },
  // },
  // {
  //   path: 'task',
  //   component: TaskComponent,
  //   data: { title: 'Task' },
  // },
  // {
  //   path: 'users',
  //   component: UsersComponent,
  //   data: { title: 'Users' },
  // },
  // {
  //   path: 'kanban',
  //   component: KanbanBoardComponent,
  //   data: { title: 'Kanban' },
  // },
  // {
  //   path: 'team',
  //   component: TeamComponent,
  //   data: { title: 'Team' },
  // },
]