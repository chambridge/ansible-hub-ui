import { t } from '@lingui/macro';
import * as React from 'react';
import './namespace-form.scss';
import { validateURLHelper } from 'src/utilities';

import {
  Form,
  FormGroup,
  TextInput,
  TextArea,
  Alert,
} from '@patternfly/react-core';
import { PlusCircleIcon, TrashIcon } from '@patternfly/react-icons';

import {
  NamespaceCard,
  ObjectPermissionField,
  AlertType,
} from 'src/components';
import { NamespaceType } from 'src/api';
import { errorMessage, ErrorMessagesType } from 'src/utilities';

interface IProps {
  namespace: NamespaceType;
  errorMessages: ErrorMessagesType;
  userId: string;

  updateNamespace: (namespace) => void;
}

interface IState {
  newNamespaceGroup: string;
  formErrors?: {
    groups?: AlertType;
  };
}

export class NamespaceForm extends React.Component<IProps, IState> {
  constructor(props) {
    super(props);

    this.state = {
      newNamespaceGroup: '',
      formErrors: {
        groups: null,
      },
    };
  }

  render() {
    const { namespace, errorMessages } = this.props;

    const { formErrors } = this.state;

    if (!namespace) {
      return null;
    }
    return (
      <Form>
        <div className='hub-card-row'>
          <div className='fields'>
            <FormGroup fieldId='name' label={t`Name`} isRequired>
              <TextInput
                isRequired
                isDisabled
                id='name'
                type='text'
                value={namespace.name}
              />
            </FormGroup>

            <br />

            <FormGroup
              fieldId='company'
              label={t`Company name`}
              helperTextInvalid={errorMessages['company']}
              validated={this.toError(!('company' in errorMessages))}
            >
              <TextInput
                validated={this.toError(!('company' in errorMessages))}
                id='company'
                type='text'
                value={namespace.company}
                onChange={(value, event) => this.updateField(value, event)}
              />
            </FormGroup>
          </div>
          <div className='card'>
            <NamespaceCard {...namespace} />
          </div>
        </div>

        <FormGroup
          fieldId='groups'
          label={t`Namespace owners`}
          className='namespace-owners'
          helperTextInvalid={errorMessages['groups']}
          validated={this.toError(
            !isNaN(Number(this.state.newNamespaceGroup)) &&
              !('groups' in errorMessages),
          )}
        >
          <br />
          {formErrors?.groups ? (
            <Alert title={formErrors.groups.title} variant='danger' isInline>
              {formErrors.groups.description}
            </Alert>
          ) : (
            <ObjectPermissionField
              groups={namespace.groups}
              availablePermissions={['change_namespace', 'upload_to_namespace']}
              setGroups={(g) => {
                const newNS = { ...namespace };
                newNS.groups = g;
                this.props.updateNamespace(newNS);
              }}
              onError={(err) => {
                const { status, statusText } = err.response;
                this.setState({
                  formErrors: {
                    ...this.state.formErrors,
                    groups: {
                      title: t`Groups list could not be displayed.`,
                      description: errorMessage(status, statusText),
                      variant: 'danger',
                    },
                  },
                });
              }}
            ></ObjectPermissionField>
          )}
        </FormGroup>

        <FormGroup
          fieldId='avatar_url'
          label={t`Logo URL`}
          helperTextInvalid={errorMessages['avatar_url']}
          validated={this.toError(!('avatar_url' in errorMessages))}
        >
          <TextInput
            validated={this.toError(!('avatar_url' in errorMessages))}
            id='avatar_url'
            type='text'
            value={namespace.avatar_url}
            onChange={(value, event) => this.updateField(value, event)}
          />
        </FormGroup>

        <FormGroup
          fieldId='description'
          label={t`Description`}
          helperTextInvalid={errorMessages['description']}
          validated={this.toError(!('description' in errorMessages))}
        >
          <TextArea
            validated={this.toError(!('description' in errorMessages))}
            id='description'
            type='text'
            value={namespace.description}
            onChange={(value, event) => this.updateField(value, event)}
          />
        </FormGroup>

        <FormGroup
          fieldId='links'
          label={t`Useful links`}
          helperTextInvalid={this.getLinksErrorText(errorMessages)}
          validated={this.toError(
            !('links__url' in errorMessages || 'links__name' in errorMessages),
          )}
        >
          {namespace.links.map((link, index) =>
            this.renderLinkGroup(link, index),
          )}

          {namespace.links.length === 0 && (
            <PlusCircleIcon
              className='clickable'
              onClick={() => this.addLink()}
              size='sm'
            />
          )}
        </FormGroup>
      </Form>
    );
  }

  private getLinksErrorText(errorMessages): string {
    const msg: string[] = [];
    if ('links__name' in errorMessages) {
      msg.push(t`Text: ${errorMessages['links__name']}`);
    }
    if ('links__url' in errorMessages) {
      msg.push(t`URL: ${errorMessages['links__url']}`);
    }

    return msg.join(' ');
  }

  private toError(validated: boolean) {
    if (validated) {
      return 'default';
    } else {
      return 'error';
    }
  }

  private updateField(value, event) {
    const update = { ...this.props.namespace };
    update[event.target.id] = value;
    this.props.updateNamespace(update);
  }

  private updateLink(index, value, event) {
    const update = { ...this.props.namespace };
    update.links[index][event.target.id] = value;
    this.props.updateNamespace(update);
  }

  private removeLink(index) {
    const update = { ...this.props.namespace };
    update.links.splice(index, 1);
    this.props.updateNamespace(update);
  }

  private addLink() {
    const update = { ...this.props.namespace };
    update.links.push({
      name: '',
      url: '',
    });

    this.props.updateNamespace(update);
  }

  public static validateName(link): {
    validated: 'default' | 'error';
    helperTextInvalid?: string;
  } {
    if (link.url) {
      if (link.name) {
        return { validated: 'default' };
      } else {
        return {
          validated: 'error',
          helperTextInvalid: t`Name must not be empty.`,
        };
      }
    }

    // if link url is empty, there is no need to insert name because the link data will be discarded
    return { validated: 'default' };
  }

  public static validateUrl(link): ReturnType<typeof validateURLHelper> {
    if (link.url) {
      // only validate url if input is not blank, blank inputs are thrown away
      return validateURLHelper(undefined, link.url);
    }

    if (link.name) {
      return {
        validated: 'error',
        helperTextInvalid: t`URL must not be empty.`,
      };
    }

    return { validated: 'default' };
  }

  private renderLinkGroup(link, index) {
    const last = index === this.props.namespace.links.length - 1;
    return (
      <div className='useful-links' key={index}>
        <div className='link-name'>
          <FormGroup fieldId={'name'} {...NamespaceForm.validateName(link)}>
            <TextInput
              id='name'
              type='text'
              placeholder={t`Link text`}
              value={link.name}
              onChange={(value, event) => this.updateLink(index, value, event)}
              validated={NamespaceForm.validateName(link).validated}
            />
          </FormGroup>
        </div>
        <div className='link-url'>
          <FormGroup fieldId={'link'} {...NamespaceForm.validateUrl(link)}>
            <TextInput
              id='url'
              type='text'
              placeholder={t`Link URL`}
              value={link.url}
              onChange={(value, event) => this.updateLink(index, value, event)}
              validated={NamespaceForm.validateUrl(link.url).validated}
            />
          </FormGroup>
        </div>
        <div className='link-button'>
          <div className='link-container'>
            <TrashIcon
              className='clickable'
              onClick={() => this.removeLink(index)}
              size='sm'
            />
          </div>

          <div className='link-container'>
            {last && (
              <PlusCircleIcon
                className='clickable'
                onClick={() => this.addLink()}
                size='sm'
              />
            )}
          </div>
        </div>
      </div>
    );
  }
}
