import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, TranslateModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardPage {
  sections = [
    {
      title: 'ADMIN.DASHBOARD.USERS_TITLE',
      icon: 'group',
      route: '/admin/users',
      desc: 'ADMIN.DASHBOARD.USERS_DESC',
    },
    {
      title: 'ADMIN.DASHBOARD.FILES_TITLE',
      icon: 'folder',
      route: '/admin/files',
      desc: 'ADMIN.DASHBOARD.FILES_DESC',
    },
    {
      title: 'ADMIN.DASHBOARD.MESSAGES_TITLE',
      icon: 'chat',
      route: '/admin/messages',
      desc: 'ADMIN.DASHBOARD.MESSAGES_DESC',
    },
    {
      title: 'ADMIN.DASHBOARD.APP_INFO_TITLE',
      icon: 'info',
      route: '/admin/app-info',
      desc: 'ADMIN.DASHBOARD.APP_INFO_DESC',
    },
    {
      title: 'ADMIN.DASHBOARD.RISK_WEIGHTS_TITLE',
      icon: 'science',
      route: '/admin/risk-weights',
      desc: 'ADMIN.DASHBOARD.RISK_WEIGHTS_DESC',
    },
    {
      title: 'ADMIN.DASHBOARD.COMPANIES_TITLE',
      icon: 'business',
      route: '/admin/companies',
      desc: 'ADMIN.DASHBOARD.COMPANIES_DESC',
    },
  ];
}
