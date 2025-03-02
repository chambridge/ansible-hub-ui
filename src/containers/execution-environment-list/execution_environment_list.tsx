import { t, Trans } from '@lingui/macro';
import * as React from 'react';
import './execution-environment.scss';

import { withRouter, RouteComponentProps, Link } from 'react-router-dom';
import {
  Button,
  DropdownItem,
  Label,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import {
  ExecutionEnvironmentAPI,
  ExecutionEnvironmentRemoteAPI,
  ExecutionEnvironmentType,
} from 'src/api';
import { filterIsSet, parsePulpIDFromURL, ParamHelper } from 'src/utilities';
import {
  AlertList,
  AlertType,
  AppliedFilters,
  BaseHeader,
  CompoundFilter,
  DateComponent,
  DeleteExecutionEnvironmentModal,
  EmptyStateFilter,
  EmptyStateNoData,
  LoadingPageSpinner,
  Main,
  Pagination,
  PublishToControllerModal,
  RepositoryForm,
  SortTable,
  Tooltip,
  closeAlertMixin,
  EmptyStateUnauthorized,
  ListItemActions,
} from 'src/components';
import { formatPath, Paths } from '../../paths';
import { AppContext } from 'src/loaders/app-context';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';

interface IState {
  alerts: AlertType[];
  itemCount: number;
  itemToEdit?: ExecutionEnvironmentType;
  items: ExecutionEnvironmentType[];
  loading: boolean;
  params: {
    page?: number;
    page_size?: number;
  };
  publishToController: { digest?: string; image: string; tag?: string };
  showRemoteModal: boolean;
  unauthorized: boolean;
  showDeleteModal: boolean;
  selectedItem: ExecutionEnvironmentType;
  inputText: string;
  formError: { title: string; detail: string }[];
}

class ExecutionEnvironmentList extends React.Component<
  RouteComponentProps,
  IState
> {
  constructor(props) {
    super(props);

    const params = ParamHelper.parseParamString(props.location.search, [
      'page',
      'page_size',
    ]);

    if (!params['page_size']) {
      params['page_size'] = 10;
    }

    if (!params['sort']) {
      params['sort'] = 'name';
    }

    this.state = {
      alerts: [],
      itemCount: 0,
      itemToEdit: null,
      items: [],
      loading: true,
      params,
      publishToController: null,
      showRemoteModal: false,
      unauthorized: false,
      showDeleteModal: false,
      selectedItem: null,
      inputText: '',
      formError: [],
    };
  }

  componentDidMount() {
    if (!this.context.user || this.context.user.is_anonymous) {
      this.setState({ unauthorized: true, loading: false });
    } else {
      this.queryEnvironments();
      this.setState({ alerts: this.context.alerts });
    }
  }

  componentWillUnmount() {
    this.context.setAlerts([]);
  }

  render() {
    const {
      alerts,
      itemCount,
      itemToEdit,
      items,
      loading,
      params,
      publishToController,
      showRemoteModal,
      unauthorized,
      showDeleteModal,
      selectedItem,
    } = this.state;

    const noData = items.length === 0 && !filterIsSet(params, ['name']);
    const pushImagesButton = (
      <Button
        variant='link'
        onClick={() =>
          window.open(
            'https://access.redhat.com/documentation/en-us/red_hat_ansible_automation_platform/2.1/html-single/managing_containers_in_private_automation_hub/index',
            '_blank',
          )
        }
        data-cy='push-images-button'
      >
        <Trans>Push container images</Trans> <ExternalLinkAltIcon />
      </Button>
    );
    const addRemoteButton = (
      <Button
        onClick={() =>
          this.setState({
            showRemoteModal: true,
            itemToEdit: {} as ExecutionEnvironmentType,
          })
        }
        variant='primary'
      >
        <Trans>Add execution environment</Trans>
      </Button>
    );

    return (
      <React.Fragment>
        <AlertList
          alerts={alerts}
          closeAlert={(i) => this.closeAlert(i)}
        ></AlertList>
        <PublishToControllerModal
          digest={publishToController?.digest}
          image={publishToController?.image}
          isOpen={!!publishToController}
          onClose={() => this.setState({ publishToController: null })}
          tag={publishToController?.tag}
        />
        {showRemoteModal && this.renderRemoteModal(itemToEdit)}
        <BaseHeader title={t`Execution Environments`}></BaseHeader>

        {showDeleteModal && (
          <DeleteExecutionEnvironmentModal
            selectedItem={selectedItem ? selectedItem.name : ''}
            closeAction={() =>
              this.setState({ showDeleteModal: false, selectedItem: null })
            }
            afterDelete={() => this.queryEnvironments()}
            addAlert={(text, variant, description = undefined) =>
              this.setState({
                alerts: alerts.concat([
                  { title: text, variant: variant, description: description },
                ]),
              })
            }
          ></DeleteExecutionEnvironmentModal>
        )}
        {unauthorized ? (
          <EmptyStateUnauthorized />
        ) : noData && !loading ? (
          <EmptyStateNoData
            title={t`No container repositories yet`}
            description={t`You currently have no container repositories. Add a container repository via the CLI to get started.`}
            button={
              <>
                {addRemoteButton}
                <div>&nbsp;</div>
                {pushImagesButton}
              </>
            }
          />
        ) : (
          <Main>
            {loading ? (
              <LoadingPageSpinner />
            ) : (
              <section className='body'>
                <div className='hub-container-list-toolbar'>
                  <Toolbar>
                    <ToolbarContent>
                      <ToolbarGroup>
                        <ToolbarItem>
                          <CompoundFilter
                            inputText={this.state.inputText}
                            onChange={(text) =>
                              this.setState({ inputText: text })
                            }
                            updateParams={(p) => {
                              p['page'] = 1;
                              this.updateParams(p, () =>
                                this.queryEnvironments(),
                              );
                            }}
                            params={params}
                            filterConfig={[
                              {
                                id: 'name',
                                title: t`Container repository name`,
                              },
                            ]}
                          />
                        </ToolbarItem>
                        <ToolbarItem>{addRemoteButton}</ToolbarItem>
                        <ToolbarItem>{pushImagesButton}</ToolbarItem>
                      </ToolbarGroup>
                    </ToolbarContent>
                  </Toolbar>

                  <Pagination
                    params={params}
                    updateParams={(p) =>
                      this.updateParams(p, () => this.queryEnvironments())
                    }
                    count={itemCount}
                    isTop
                  />
                </div>
                <div>
                  <AppliedFilters
                    updateParams={(p) => {
                      this.updateParams(p, () => this.queryEnvironments());
                      this.setState({ inputText: '' });
                    }}
                    params={params}
                    ignoredParams={['page_size', 'page', 'sort']}
                  />
                </div>
                {this.renderTable(params)}

                <Pagination
                  params={params}
                  updateParams={(p) =>
                    this.updateParams(p, () => this.queryEnvironments())
                  }
                  count={itemCount}
                />
              </section>
            )}
          </Main>
        )}
      </React.Fragment>
    );
  }

  private renderTable(params) {
    const { items } = this.state;
    if (items.length === 0) {
      return <EmptyStateFilter />;
    }

    const sortTableOptions = {
      headers: [
        {
          title: t`Container repository name`,
          type: 'alpha',
          id: 'name',
        },
        {
          title: t`Description`,
          type: 'alpha',
          id: 'description',
        },
        {
          title: t`Created`,
          type: 'numeric',
          id: 'created',
        },
        {
          title: t`Last modified`,
          type: 'alpha',
          id: 'updated',
        },
        {
          title: t`Container registry type`,
          type: 'none',
          id: 'type',
        },
        {
          title: '',
          type: 'none',
          id: 'controls',
        },
      ],
    };

    return (
      <table className='hub-c-table-content pf-c-table'>
        <SortTable
          options={sortTableOptions}
          params={params}
          updateParams={(p) =>
            this.updateParams(p, () => this.queryEnvironments())
          }
        />
        <tbody>{items.map((user, i) => this.renderTableRow(user, i))}</tbody>
      </table>
    );
  }

  private renderTableRow(item, index: number) {
    const description = item.description;

    const canEdit = item.namespace.my_permissions.includes(
      'container.change_containernamespace',
    );

    const dropdownItems = [
      canEdit && (
        <DropdownItem
          key='edit'
          onClick={() =>
            this.setState({
              showRemoteModal: true,
              itemToEdit: { ...item },
            })
          }
        >
          {t`Edit`}
        </DropdownItem>
      ),
      item.pulp.repository.remote && (
        <DropdownItem key='sync' onClick={() => this.sync(item.name)}>
          {t`Sync from registry`}
        </DropdownItem>
      ),
      <DropdownItem
        key='publish-to-controller'
        onClick={() => {
          this.setState({
            publishToController: {
              image: item.name,
            },
          });
        }}
      >
        {t`Use in Controller`}
      </DropdownItem>,
      this.context.user.model_permissions.delete_containerrepository && (
        <DropdownItem
          key='delete'
          onClick={() =>
            this.setState({ selectedItem: item, showDeleteModal: true })
          }
        >
          {t`Delete`}
        </DropdownItem>
      ),
    ].filter((truthy) => truthy);

    return (
      <tr data-cy={`ExecutionEnvironmentList-row-${item.name}`} key={index}>
        <td>
          <Link
            to={formatPath(Paths.executionEnvironmentDetail, {
              container: item.pulp.distribution.base_path,
            })}
          >
            {item.name}
          </Link>
        </td>
        {description ? (
          <td className={'pf-m-truncate'}>
            <Tooltip content={description}>{description}</Tooltip>
          </td>
        ) : (
          <td></td>
        )}
        <td>
          <DateComponent date={item.created} />
        </td>
        <td>
          <DateComponent date={item.updated} />
        </td>
        <td>
          <Label>{item.pulp.repository.remote ? t`Remote` : t`Local`}</Label>
        </td>
        <ListItemActions kebabItems={dropdownItems} />
      </tr>
    );
  }

  private renderRemoteModal(itemToEdit) {
    const { name, namespace, description, pulp } = itemToEdit;
    const { pulp_id, registry, upstream_name, include_tags, exclude_tags } =
      pulp?.repository?.remote || {};
    const remote = pulp?.repository ? !!pulp?.repository?.remote : true; // add only supports remote
    const isNew = !pulp?.repository; // only exists in real data
    const distributionPulpId = pulp?.distribution?.pulp_id;
    const { alerts } = this.state;
    return (
      <RepositoryForm
        isRemote={!!remote}
        isNew={isNew}
        name={name}
        namespace={namespace?.name}
        description={description}
        upstreamName={upstream_name}
        registry={registry}
        excludeTags={exclude_tags || []}
        includeTags={include_tags || []}
        permissions={namespace?.my_permissions || []}
        remotePulpId={pulp_id}
        distributionPulpId={distributionPulpId}
        formError={this.state.formError}
        onSave={(promise) => {
          promise
            .then(() => {
              this.setState(
                {
                  showRemoteModal: false,
                  itemToEdit: null,
                  alerts: alerts.concat({
                    variant: 'success',
                    title: isNew ? (
                      <Trans>
                        Execution environment &quot;{name}&quot; has been added
                        successfully.
                      </Trans>
                    ) : (
                      <Trans>
                        Saved changes to execution environment &quot;{name}
                        &quot;.
                      </Trans>
                    ),
                  }),
                },
                () => this.queryEnvironments(),
              );
            })
            .catch((err) => {
              this.setState({
                formError: err.response.data.errors.map((error) => {
                  return {
                    title: error.title,
                    detail: error.source.parameter + ': ' + error.detail,
                  };
                }),
              });
            });
        }}
        onCancel={() =>
          this.setState({
            showRemoteModal: false,
            itemToEdit: null,
          })
        }
        addAlert={(variant, title, description) =>
          this.addAlert(title, variant, description)
        }
      />
    );
  }

  private queryEnvironments() {
    this.setState({ loading: true }, () =>
      ExecutionEnvironmentAPI.list(this.state.params)
        .then((result) =>
          this.setState({
            items: result.data.data,
            itemCount: result.data.meta.count,
            loading: false,
          }),
        )
        .catch((e) =>
          this.addAlert(t`Error loading environments.`, 'danger', e?.message),
        ),
    );
  }

  private get updateParams() {
    return ParamHelper.updateParamsMixin();
  }

  private get closeAlert() {
    return closeAlertMixin('alerts');
  }

  private addAlert(title, variant, description?) {
    this.setState({
      alerts: [
        ...this.state.alerts,
        {
          description,
          title,
          variant,
        },
      ],
    });
  }

  private sync(name) {
    ExecutionEnvironmentRemoteAPI.sync(name)
      .then((result) => {
        const task_id = parsePulpIDFromURL(result.data.task);
        this.addAlert(
          <Trans>
            Sync started for execution environment &quot;{name}&quot;.
          </Trans>,
          'info',
          <span>
            <Trans>
              See the task management{' '}
              <Link to={formatPath(Paths.taskDetail, { task: task_id })}>
                detail page{' '}
              </Link>
              for the status of this task.
            </Trans>
          </span>,
        );
      })
      .catch(() => this.addAlert(t`Sync failed for ${name}`, 'danger'));
  }
}

export default withRouter(ExecutionEnvironmentList);
ExecutionEnvironmentList.contextType = AppContext;
