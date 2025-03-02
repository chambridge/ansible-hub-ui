import { t } from '@lingui/macro';
import * as React from 'react';
import './collection-filter.scss';
import {
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';

import { AppliedFilters, CompoundFilter } from 'src/components';
import { Constants } from 'src/constants';

interface IProps {
  ignoredParams: string[];
  params: {
    keywords?: string;
    page?: number;
    page_size?: number;
    tags?: string[];
    view_type?: string;
  };
  updateParams: (p) => void;
}

interface IState {
  inputText: string;
}

export class CollectionFilter extends React.Component<IProps, IState> {
  constructor(props) {
    super(props);

    this.state = {
      inputText: props.params.keywords || '',
    };
  }

  componentDidUpdate(prevProps) {
    if (prevProps.params.keywords !== this.props.params['keywords']) {
      this.setState({ inputText: this.props.params['keywords'] || '' });
    }
  }

  render() {
    const { ignoredParams, params, updateParams } = this.props;

    const filterConfig = [
      {
        id: 'keywords',
        title: t`Keywords`,
      },
      {
        id: 'tags',
        title: t`Tag`,
        inputType: 'multiple' as const,
        options: Constants.COLLECTION_FILTER_TAGS.map((tag) => ({
          id: tag,
          title: tag,
        })),
      },
      this.context?.featureFlags?.collection_signing === true && {
        id: 'sign_state',
        title: t`Sign state`,
        inputType: 'select' as const,
        options: [
          { id: 'signed', title: t`Signed` },
          { id: 'unsigned', title: t`Unsigned` },
          { id: 'partial', title: t`Partial` },
        ],
      },
    ].filter(Boolean);

    return (
      <Toolbar>
        <ToolbarContent>
          <ToolbarGroup style={{ marginLeft: 0 }}>
            <ToolbarItem>
              <CompoundFilter
                inputText={this.state.inputText}
                onChange={(text) => this.setState({ inputText: text })}
                updateParams={updateParams}
                params={params}
                filterConfig={filterConfig}
              />
              <ToolbarItem>
                <AppliedFilters
                  niceNames={{
                    sign_state: t`sign state`,
                    tags: t`tags`,
                    keywords: t`keywords`,
                  }}
                  style={{ marginTop: '16px' }}
                  updateParams={updateParams}
                  params={params}
                  ignoredParams={ignoredParams}
                />
              </ToolbarItem>
            </ToolbarItem>
          </ToolbarGroup>
        </ToolbarContent>
      </Toolbar>
    );
  }
}
