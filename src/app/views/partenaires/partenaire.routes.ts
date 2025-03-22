import { Route } from "@angular/router";
import { PartenaireListComponent } from "./partenaire-list/partenaire-list.component";



export const PARTENAIRES_ROUTES: Route[] = [
  {
    path: 'list',
    component: PartenaireListComponent,
    data: { title: 'Clients' },
  },
  // {
  //   path: 'create',
  //   component: CreateComponent,
  //   data: { title: 'Create Project' },
  // },
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