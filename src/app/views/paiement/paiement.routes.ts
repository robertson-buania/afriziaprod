import { Route } from "@angular/router";
import { PaiementListComponent } from "./paiement-list/paiement-list.component";



export const PAIEMENT_ROUTES: Route[] = [
  {
    path: 'list',
    component: PaiementListComponent,
    data: { title: 'Liste paiements' },
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