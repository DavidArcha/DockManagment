import { Component, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-multilevel-grid',
  standalone: false,
  templateUrl: './multilevel-grid.component.html',
  styleUrl: './multilevel-grid.component.scss'
})
export class MultilevelGridComponent implements OnInit {
  @Input() gridData: any[] = [];

  columnDefs = [
    { field: 'label', headerName: 'Date', flex: 1 }
  ];

  gridOptions: any = {};

  ngOnInit() {
    this.gridOptions = {
      pagination: true,
      paginationPageSize: 5,
      masterDetail: true,
      detailCellRendererParams: {
        detailGridOptions: {
          columnDefs: [
            { field: 'name', headerName: 'Name', flex: 1 },
            { field: 'type', headerName: 'Type', width: 100 }
          ],
          pagination: true,
          paginationPageSize: 2
        },
        getDetailRowData: (params: any) => {
          params.successCallback(params.data.children);
        }
      }
    };
  }

  get rowData() {
    return this.gridData;
  }
}