import { Component, OnInit, Input, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { ModuleRegistry, AllCommunityModule, createGrid, GridApi, GridOptions } from 'ag-grid-community';

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-multilevel-grid',
  standalone: false,
  templateUrl: './multilevel-grid.component.html',
  styleUrl: './multilevel-grid.component.scss'
})
export class MultilevelGridComponent implements OnInit, OnChanges, OnDestroy {
  @Input() gridData: any[] = [];
  
  rowData: any[] = [];
  originalData: any[] = [];
  nestedGrids: Map<string, GridApi> = new Map(); // Track nested grid instances

  columnDefs = [
    { 
      field: 'label', 
      headerName: 'Date', // Add "Date" as header name
      flex: 1,
      cellRenderer: (params: any) => {
        if (params.data.isParent) {
          const expanded = params.data.expanded || false;
          const arrow = expanded ? '▼' : '▶';
          return `<div style="display: flex; align-items: center; height: 100%; width: 100%; position: relative;">
                    <span style="cursor: pointer; user-select: none; font-size: 14px; position: absolute; left: 10px;">
                      ${arrow}
                    </span>
                    <span style="cursor: pointer; user-select: none; font-weight: bold; font-size: 14px; width: 100%; text-align: center;">
                      ${params.data.label}
                    </span>
                  </div>`;
        } else if (params.data.isChildTable) {
          // Create a unique ID for this nested grid
          const gridId = `nested-grid-${params.data.parentId}`;
          
          // Return a div that will contain the nested AG Grid
          setTimeout(() => {
            this.createNestedGrid(gridId, params.data.children);
          }, 0);
          
          return `<div id="${gridId}" style="margin-left: 10px; padding: 5px; width: calc(100% - 20px); max-width: 800px; height: 300px;"></div>`;
        }
        return '';
      }
    }
  ];

  gridOptions: any = {
    theme: 'legacy',
    pagination: true,
    paginationPageSize: 5, // Smaller page size to see pagination better
    paginationPageSizeSelector: [5, 10, 20], // Page size options
    headerHeight: 40, // Show header with proper height
    suppressPaginationPanel: false, // Ensure pagination panel is visible
    paginationAutoPageSize: false, // Use our custom page sizes
    getRowHeight: (params: any) => {
      if (params.data.isParent) {
        return 40; // Parent row height
      } else if (params.data.isChildTable) {
        // Fixed height for nested grid with pagination
        return 320; // Height to accommodate nested grid + pagination panel
      }
      return 50; // Default height
    },
    onRowClicked: (event: any) => {
      console.log('Row clicked:', event.data);
      if (event.data.isParent) {
        this.toggleRow(event.data.id);
      }
    }
  };

  ngOnInit() {
    this.initializeData();
    
    // Make button handler available globally
    (window as any).handleNestedGridAction = (name: string, type: string) => {
      this.handleNestedGridAction(name, type);
    };
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['gridData'] && changes['gridData'].currentValue) {
      this.initializeData();
    }
  }

  private initializeData() {
    this.originalData = [...this.gridData];
    this.rowData = this.getDisplayData();
    console.log('Initialized rowData:', this.rowData);
  }

  private getDisplayData(): any[] {
    const result: any[] = [];
    
    this.originalData.forEach((parent) => {
      // Add parent row - only show label
      const parentRow = {
        id: parent.id,
        label: parent.label,
        isParent: true,
        expanded: false,
        children: parent.children
      };
      result.push(parentRow);
    });
    
    return result;
  }

  toggleRow(id: number): void {
    console.log('Toggle row called for ID:', id);
    
    // Find the parent row and toggle its expanded state
    const parentIndex = this.rowData.findIndex(row => row.isParent && row.id === id);
    if (parentIndex === -1) return;
    
    const parentRow = this.rowData[parentIndex];
    parentRow.expanded = !parentRow.expanded;
    
    console.log('Parent row expanded state:', parentRow.expanded);
    
    // Remove any existing child table for this parent
    const newRowData = this.rowData.filter(row => 
      !(row.parentId === id && row.isChildTable)
    );
    
    // If expanding, insert child table after the parent
    if (parentRow.expanded && parentRow.children && parentRow.children.length > 0) {
      const childTableRow = {
        isChildTable: true,
        parentId: id,
        children: parentRow.children,
        label: '' // Empty label for the table row
      };
      
      // Insert child table right after the parent
      newRowData.splice(parentIndex + 1, 0, childTableRow);
    }
    
    this.rowData = [...newRowData]; // Create new array to trigger change detection
    console.log('Updated rowData:', this.rowData);
  }

  private createNestedGrid(gridId: string, children: any[]): void {
    // Wait for the DOM element to be available
    const checkElement = () => {
      const eGridDiv = document.getElementById(gridId);
      if (eGridDiv) {
        // Destroy existing grid if it exists
        if (this.nestedGrids.has(gridId)) {
          this.nestedGrids.get(gridId)?.destroy();
        }

        // Define column definitions for the nested grid
        const nestedColumnDefs = [
          { 
            field: 'name', 
            headerName: 'Name', 
            flex: 1,
            minWidth: 120
          },
          { 
            field: 'type', 
            headerName: 'Type', 
            width: 100
          },
          {
            headerName: 'Action',
            width: 100,
            cellRenderer: (params: any) => {
              return `<button 
                        style="
                          background-color: #007bff; 
                          color: white; 
                          border: none; 
                          padding: 4px 8px; 
                          border-radius: 4px; 
                          cursor: pointer; 
                          font-size: 12px;
                        " 
                        onclick="window.handleNestedGridAction('${params.data.name}', '${params.data.type}')"
                      >
                        Action
                      </button>`;
            }
          }
        ];

        // Grid options for the nested grid
        const nestedGridOptions: GridOptions = {
          theme: 'legacy',
          columnDefs: nestedColumnDefs,
          rowData: children,
          headerHeight: 35,
          rowHeight: 40,
          suppressHorizontalScroll: false,
          domLayout: 'normal', // Changed from autoHeight to normal for pagination
          pagination: true, // Enable pagination for nested grid
          paginationPageSize: 3, // Smaller page size for nested grid
          paginationPageSizeSelector: [3, 5, 10], // Page size options for nested grid
          suppressPaginationPanel: false, // Show pagination panel
          paginationAutoPageSize: false, // Use custom page sizes
          defaultColDef: {
            resizable: true,
            sortable: true
          }
        };

        // Create the nested grid
        const gridApi = createGrid(eGridDiv, nestedGridOptions);
        this.nestedGrids.set(gridId, gridApi);
      } else {
        // Retry if element not found yet
        setTimeout(checkElement, 10);
      }
    };
    
    checkElement();
  }

  ngOnDestroy(): void {
    // Clean up nested grids
    this.nestedGrids.forEach((gridApi) => {
      gridApi.destroy();
    });
    this.nestedGrids.clear();
  }

  handleNestedGridAction(name: string, type: string): void {
    console.log('Nested grid action clicked:', { name, type });
    // You can add your custom action logic here
    alert(`Action clicked for: ${name} (${type})`);
  }
}